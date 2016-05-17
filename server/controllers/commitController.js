const request = require('request');
const db = require('../db/database.js').db;
const pgp = require('../db/database.js').pgp;
const token = require('../config/github.config').token;
const rp = require('request-promise');
const getRepoOwners = require('../helpers/getRepoOwners');

// GET at '/api/v1/users/:id/commits'
exports.retrieveCommits = function(req, res) {
  var queryId = req.params.id;
  db.any('SELECT * FROM $1~ ' +
    'WHERE $2~ = $3',
    ['commits', 'user_id', queryId])
    .then(commits => {
      res.send(commits);
    })
    .catch(error => {
      console.error('Error querying commits: ', error);
      res.status(500).send;
    }); 
};

// PATCH at '/api/v1/users/:id/commits'
exports.updateCommits = function(req, res) {
  var queryId = req.params.id;
  var dbTimestamp = pgp.as.date(new Date());
  var repoCountUpdateCommits = 0;
  
  // ** HELPER FUNCTIONS **
  
  // to be used once each commit's author has been added to the users table
  var saveCommitsAndJoins = (commits, repoId, totalRepos, userId) => {
    // save commits to database, using SHA as unique id
    db.tx(t => {
      var queries = [];
      if (commits.length > 0) {
        queries = commits.map(commit => {
          if (!!commit.author) {
            return t.any('INSERT INTO $1~ AS $2~ ($3~, $4~, $5~, $6~, $7~) ' +
              'VALUES ($8, $9, $10, $11, $12) ' +
              'ON CONFLICT ($3~) ' + 
              'DO UPDATE SET ($4~, $5~, $6~, $7~) = ($9, $10, $11, $12) ' +
              'WHERE $2~.$3~ = $8',
              ['commits', 'c', 'sha', 'updated_ga', 'date', 'user_id', 'commit_message',
              commit.sha, dbTimestamp, pgp.as.date(new Date(commit.commit.author.date)), commit.author.id, commit.commit.message]);  
          }

        });
      }
      return t.batch(queries);
    })
    .then(data => {
      // save joins to database, associating each commit with a repo
      db.tx(t => {
        var queries = [];
        if (commits.length > 0) {
          queries = commits.map(commit => {
            // only add a join row if it doesn't exist already
            if (!!commit.author) {
              return t.any('INSERT INTO $1~ ($2~, $3~, $4~) ' +
                'SELECT $5, $6, $7 WHERE NOT EXISTS ' +
                '(SELECT * FROM $1~ WHERE $3~ = $6 AND $4~ = $7)',
                ['commits_repos', 'created_ga', 'repo_id', 'commit_sha',
                dbTimestamp, repoId, commit.sha]);
            }
          });
        }
        return t.batch(queries);
      }) 
      .then(data => {
        repoCountUpdateCommits++;
        // once all commits from all repos have been added,
        if (repoCountUpdateCommits === totalRepos) {
          // query the database for this user's commits
          db.any('SELECT * FROM $1~ ' +
            'WHERE $2~ = $3',
            ['commits', 'user_id', userId])
          .then(commits => {
            // send back the updated commits
            console.log('Successfully patched commits for userId: ' + userId);
            res.send(commits);
          })
          .catch(error => {
            console.error('Error querying commits: ', error);
            res.status(500).send;
          }); 
        }
      })
      .catch(error => {
        console.error('Error adding joins: ', error);
        res.status(500).send;
      }); 
    })
    .catch(error => {
      console.error('Error adding commits: ', error);
      res.status(500).send;
    }); 
  };            
  
  var getCommitsFromGitHub = (repoOwners) => {
    var totalRepos = repoOwners.length;
    var repoCountGetCommits = 0;
    
    repoOwners.forEach(repoOwner => {
      var ownerName;
      if (repoOwner.repoOwnerId === repoOwner.userId) {
        ownerName = repoOwner.userName;
      } else {
        ownerName = repoOwner.orgName;
      }
      // configuration of GitHub GET request
      var options = {
        uri: 'https://api.github.com/repos/' + ownerName + '/' + repoOwner.repoName + '/commits',
        headers: {
          'User-Agent': repoOwner.userName,
          // Uncomment this line to make GET requests from within the site (not with Postman)
          'Authorization': `token ${req.body.token}`
          // Uncomment this line to make GET requests from Postman
          // 'Authorization': 'token ' + token
        },
        json: true // Automatically parses the JSON string in the response 
      };
      // invoke the GET request
      rp(options)
        .then(commits => {
          db.tx(t => {
            // insert each commit's author as a user if they don't exist in users table
            var queries = [];
            if (commits.length > 0) { 
              queries = commits.map(commit => {
                if (!!commit.author) {
                  return t.any('INSERT INTO $1~ as $2~ ($3~, $4~, $5~, $6~, $7~, $8~) ' +
                    'VALUES ($9, $10, $11, $12, $13, $14) ' +
                    'ON CONFLICT ($3~) ' +
                    'DO NOTHING',
                    ['users', 'u', 'id', 'created_ga', 'username', 'signed_up', 'email', 'avatar_url',
                    commit.author.id, dbTimestamp, commit.author.login, false, commit.commit.author.email, commit.author.avatar_url]);
                }
              });
            }
            return t.batch(queries);
          })
          .then(data => {
            repoCountGetCommits++;
            saveCommitsAndJoins(commits, repoOwner.repoId, totalRepos, repoOwner.userId);
          })
          .catch(error => {
            console.error('Error adding commit authors: ', error);
            res.status(500).send;
          });
        })
      .catch(error => {
        if (error.statusCode !== 500) {
          repoCountGetCommits++;
          console.log('Error in getCommitsFromGitHub - repo: "' + repoOwner.repoName + '"" for user: "' + repoOwner.userName + '"" not found in GitHub');
          if (repoCountGetCommits === totalRepos) {
            res.status(500).send();
          }
        } else {
          console.error('Error in GET from GitHub: ', error);
          res.status(500).send;
        }
      });
    });  
  };
  
  // CALL HELPER FUNCTIONS
  
  getRepoOwners(queryId, getCommitsFromGitHub);
  
};

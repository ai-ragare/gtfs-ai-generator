// MongoDB Playground
// Use Ctrl+Space to get completions for 'db', 'ObjectId', 'ISODate', 'RegExp' and more.
// Use Ctrl+Shift+P and select 'MongoDB: Connect' to connect to a database.
// Use Ctrl+Shift+P and select 'MongoDB: Run playground' to run the playground.

// Select the database to use
use('gtfs_generator');

// Find all documents in the 'routes' collection
db.routes.find({});

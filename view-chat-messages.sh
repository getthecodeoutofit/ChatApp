# Connect to MongoDB shell
mongo

# Switch to your database (assuming it's named 'chatterbox')
use chatterbox

# View room messages (most recent first, limited to 10)
db.messages.find().sort({timestamp: -1}).limit(10).pretty()

# View private messages between users
db.privatemessages.find().sort({timestamp: -1}).limit(10).pretty()

# Filter messages by room
db.messages.find({room: "global"}).sort({timestamp: -1}).limit(10).pretty()

# Filter private messages between specific users
db.privatemessages.find({
  $or: [
    {sender: "user1", recipient: "user2"},
    {sender: "user2", recipient: "user1"}
  ]
}).sort({timestamp: -1}).pretty()

# View message content (plaintext version)
db.messages.find({}, {sender: 1, room: 1, plaintext: 1, timestamp: 1}).sort({timestamp: -1}).limit(10).pretty()

# Count messages by room
db.messages.aggregate([
  {$group: {_id: "$room", count: {$sum: 1}}},
  {$sort: {count: -1}}
])

# Count private messages by sender
db.privatemessages.aggregate([
  {$group: {_id: "$sender", count: {$sum: 1}}},
  {$sort: {count: -1}}
])
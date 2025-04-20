const fs = require('fs');
const path = require('path');

async function generateTranscript(channel) {
  let allMessages = [];
  let lastMessageId;

  // Fetch messages in batches of 100 until we reach 1000 messages or no more messages are available
  while (allMessages.length < 1000) {
    const options = { limit: 100 };
    if (lastMessageId) {
      options.before = lastMessageId;
    }

    const messages = await channel.messages.fetch(options);
    
    if (messages.size === 0) break;  // Exit if no more messages are found
    
    allMessages = [...allMessages, ...messages.array()];
    lastMessageId = messages.last().id;
  }

  let htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Transcript for ${channel.name}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          margin: 20px;
        }
        .message {
          margin-bottom: 10px;
        }
        .user {
          font-weight: bold;
          color: #2f3136;
        }
        .content {
          padding-left: 15px;
        }
        .timestamp {
          font-size: 0.9em;
          color: gray;
        }
      </style>
    </head>
    <body>
      <h1>Transcript for Ticket: ${channel.name}</h1>
      <p>Ticket Closed: <time>${new Date().toLocaleString()}</time></p>
      <div>
  `;

  // Loop through the messages and format them
  allMessages.reverse().forEach(message => {
    htmlContent += `
      <div class="message">
        <p class="user">${message.author.tag} <span class="timestamp">(${new Date(message.createdTimestamp).toLocaleString()})</span></p>
        <p class="content">${message.content}</p>
      </div>
    `;
  });

  htmlContent += `
      </div>
      <p>End of Transcript</p>
    </body>
    </html>
  `;

  // Define the file path to save the transcript
  const filePath = path.join(__dirname, `transcripts/${channel.id}_transcript.html`);

  // Create the 'transcripts' directory if it doesn't exist
  if (!fs.existsSync(path.dirname(filePath))) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
  }

  // Write the HTML content to the file
  fs.writeFileSync(filePath, htmlContent);

  // Return the file path for later use (upload to GitHub or send to the user)
  return filePath;
}

// Export the function so you can use it in other files
module.exports = { generateTranscript };

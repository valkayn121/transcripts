const fs = require('fs');
const path = require('path');
const axios = require('axios');

async function generateTranscript(channel) {
  const messages = await channel.messages.fetch({ limit: 100 });
  
  let htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Transcript for ${channel.name}</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; margin: 20px; }
        .message { margin-bottom: 10px; }
        .user { font-weight: bold; color: #2f3136; }
        .content { padding-left: 15px; }
        .timestamp { font-size: 0.9em; color: gray; }
      </style>
    </head>
    <body>
      <h1>Transcript for Ticket: ${channel.name}</h1>
      <p>Ticket Closed: <time>${new Date().toLocaleString()}</time></p>
      <div>
  `;

  messages.reverse().forEach(message => {
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

  const filePath = path.join(__dirname, `transcripts/${channel.id}_transcript.html`);
  if (!fs.existsSync(path.dirname(filePath))) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
  }
  fs.writeFileSync(filePath, htmlContent);

  const githubToken = 'your_new_token_here'; // Fine-grained PAT
  const repoOwner = 'valkayn121';
  const repoName = 'transcripts';
  const filePathOnGitHub = `transcripts/${channel.id}_transcript.html`;

  try {
    const fileContent = fs.readFileSync(filePath, { encoding: 'base64' });

    const uploadUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${filePathOnGitHub}`;

    const response = await axios.put(uploadUrl, {
      message: `Add transcript for ${channel.name}`,
      content: fileContent,
      branch: 'main'
    }, {
      headers: {
        'Authorization': `Bearer ${githubToken}`, // ✅ use Bearer for fine-grained tokens
        'Accept': 'application/vnd.github+json'
      }
    });

    console.log('Transcript uploaded to GitHub:', response.data.content.html_url);
    return response.data.content.html_url;

  } catch (error) {
    console.error('Error uploading to GitHub:', error.response?.data || error.message);
    return null;
  }
}

module.exports = { generateTranscript };

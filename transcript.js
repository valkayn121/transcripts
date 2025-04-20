const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch'); // Use this for HTTP requests (e.g., uploading to Cloudflare)

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

    if (messages.size === 0) break; // Exit if no more messages are found

    allMessages = [...allMessages, ...messages.values()]; // Using .values() to get the message collection
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

  // Upload the transcript to Cloudflare (or any other cloud service)
  const cloudflareUrl = await uploadToCloudflare(filePath);

  return cloudflareUrl;
}

// Function to upload the transcript file to Cloudflare or any cloud service
async function uploadToCloudflare(filePath) {
  const formData = new FormData();
  formData.append('file', fs.createReadStream(filePath));

  const response = await fetch('https://your-cloudflare-api-endpoint', {
    method: 'POST',
    body: formData,
    headers: {
      'Authorization': 'Bearer YOUR_CLOUDFLARE_API_KEY',
    },
  });

  const data = await response.json();
  if (data.success) {
    return data.url; // Assuming the Cloudflare API returns a URL in `data.url`
  } else {
    throw new Error('Failed to upload transcript to Cloudflare');
  }
}

// Closing ticket and sending the transcript link to the user
async function closeTicket(interaction, channel) {
  await interaction.reply({
    content: 'Closing ticket...',
    flags: 64,  // Ephemeral response
  });

  // Generate the transcript and upload it to Cloudflare
  const transcriptUrl = await generateTranscript(channel);

  // Create the button linking to the transcript
  const transcriptButton = new ButtonBuilder()
    .setLabel('View Transcript')
    .setStyle(ButtonStyle.Link)
    .setURL(transcriptUrl);

  const embed = new EmbedBuilder()
    .setTitle('Thank you for ordering!')
    .setDescription(`<:arrow:1362431935301025943> We appreciate your trust in our services. If you have any concerns or feedback, feel free to open a management ticket.\n\nTicket closed: <t:${Math.floor(Date.now() / 1000)}:R>`)
    .setImage('https://i.imgur.com/LPHkZOX.png')
    .setColor('#2f3136');

  // Get the ticket owner's user ID (permissions)
  const owner = channel.permissionOverwrites.cache.find(po => po.allow.has(PermissionsBitField.Flags.ViewChannel))?.id;
  if (owner) {
    const targetUser = await client.users.fetch(owner).catch(() => {});
    if (targetUser) {
      await targetUser.send({
        embeds: [embed],
        components: [
          {
            type: 1,  // Action Row
            components: [transcriptButton],  // Add the button
          },
        ],
      }).catch(() => {});
    }
  }

  // Delete the ticket channel
  await channel.delete().catch(() => {});
}

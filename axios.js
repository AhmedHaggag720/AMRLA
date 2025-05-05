const axios = require("axios");

const botToken = "7640388136:AAGv6v8ID6ckN_MPkVXqxMG-fySCr09bsbw"; // Your bot token
const url = `https://api.telegram.org/bot${botToken}/getUpdates`;

axios.get(url)
  .then(response => {
    if (response.data.result.length === 0) {
      console.log("No messages received yet. Please send a message to the bot.");
    } else {
      const chatId = response.data.result[0].message.chat.id;
      console.log("Your chat ID is:", chatId);
    }
  })
  .catch(error => {
    console.error("Error fetching chat ID:", error);
  });

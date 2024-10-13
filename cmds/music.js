const axios = require('axios');
const fs = require('fs');
const path = require('path');
const yts = require('yt-search');

module.exports = {
    name: "music",
    usedby: 0,
    version: "1.0.0",
    info: "Get music",
    onPrefix: false,
    dev: "Jonell Magallanes",
    cooldowns: 10,

    onLaunch: async function ({ api, event, target }) {
        if (!target[0]) {
            return api.sendMessage(`❌ Please enter a music name!`, event.threadID);
        }

        try {
            const song = target.join(" ");
            const findingMessage = await api.sendMessage(`🔍 | Finding "${song}". Please wait...`, event.threadID);

            const searchResults = await yts(song);
            const firstResult = searchResults.videos[0];

            if (!firstResult) {
                await api.editMessage(`❌ | No results found for "${song}".`, findingMessage.messageID, event.threadID);
                return;
            }

            const { title, url } = firstResult;

            await api.editMessage(`⏱️ | Music Title has been Found: "${title}". Downloading...`, findingMessage.messageID);

            
            const response = await axios.get(`https://ccprojectsjonellproject.vercel.app/api/dl?url=${url}`);
            const downloadLink = response.data.data.downloadLink.url;

            const filePath = path.resolve(__dirname, 'cache', `${Date.now()}-${title}.mp3`);
            const fileStream = fs.createWriteStream(filePath);

            
            const responseStream = await axios({
                method: 'get',
                url: downloadLink,
                responseType: 'stream',
                headers: {
                    'User-Agent': 'Mozilla/5.0'
                }
            });

            responseStream.data.pipe(fileStream);

            fileStream.on('finish', async () => {
                const stats = fs.statSync(filePath);
                const fileSizeInMB = stats.size / (1024 * 1024);

                if (fileSizeInMB > 25) {
                    await api.editMessage(`❌ | The file size exceeds 25MB limit. Unable to send "${title}".`, findingMessage.messageID, event.threadID);
                    fs.unlinkSync(filePath);
                    return;
                }

                const bold = global.fonts.bold("Music Player");
                await api.sendMessage({
                    body: `🎵 ${bold}\n${global.line}\nHere is your music about your search "${song}"\n\nTitle: ${title}\nYoutube Link: ${url}`,
                    attachment: fs.createReadStream(filePath)
                }, event.threadID);

                fs.unlinkSync(filePath);
                api.unsendMessage(findingMessage.messageID);
            });

            responseStream.data.on('error', async (error) => {
                console.error(error);
                await api.editMessage(`❌ | ${error.message}`, findingMessage.messageID, event.threadID);
                fs.unlinkSync(filePath);
            });
        } catch (error) {
            console.error(error);
            await api.editMessage(`❌ | ${error.message}`, findingMessage.messageID, event.threadID);
        }
    }
};

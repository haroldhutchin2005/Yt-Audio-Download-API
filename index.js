const express = require('express');
const ytdl = require('ytdl-core');
const ytSearch = require('yt-search');
const fs = require('fs');
const path = require('path');
const os = require('os');

const app = express();
const port = process.env.PORT || 3000;

app.get('/yt', async (req, res) => {
    const searchQuery = req.query.search;
    if (!searchQuery) {
        return res.status(400).send('Search query is required');
    }

    try {
        const searchResults = await ytSearch(searchQuery);
        const video = searchResults.videos.length > 0 ? searchResults.videos[0] : null;

        if (!video) {
            return res.status(404).send('No video found');
        }

        const videoUrl = video.url;
        const tempFilePath = path.join(os.tmpdir(), `audio_${Date.now()}.mp3`);

        const stream = ytdl(videoUrl, { filter: 'audioonly' })
            .pipe(fs.createWriteStream(tempFilePath));

        stream.on('finish', () => {
            res.setHeader('Content-Type', 'audio/mpeg');
            res.setHeader('Content-Disposition', 'inline; filename="audio.mp3"');

            const fileStream = fs.createReadStream(tempFilePath);
            fileStream.pipe(res);

            fileStream.on('end', () => {
                setTimeout(() => {
                    fs.unlink(tempFilePath, (err) => {
                        if (err) {
                            console.error('Error deleting the file:', err);
                        }
                    });
                }, 5000);
            });

            fileStream.on('error', (err) => {
                console.error('Error streaming the file:', err);
                res.status(500).send('An error occurred while streaming the audio');
            });
        });

        stream.on('error', (err) => {
            console.error('Error downloading the video:', err);
            res.status(500).send('An error occurred while downloading the audio');
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('An error occurred while processing your request');
    }
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});

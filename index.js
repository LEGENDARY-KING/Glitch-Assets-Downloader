const https = require('https');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const ProgressBar = require('progress');

// Read the file as a string
fs.readFile('.glitch-assets', 'utf8', async (err, data) => {
    if (err) {
        console.error(`Error reading file from disk: ${err}`);
    } else {
        // Replace "}" with "}," except for the last one

        let modifiedData = data.replace(/}/g, '},');

        modifiedData = modifiedData.trim().slice(0,-1); // Remove the last comma

        // Parse it as an array
        const assets = JSON.parse(`[${modifiedData}]`);

        // Create the directory if it doesn't exist
        const dir = './glitch_assets';
        if (!fs.existsSync(dir)){
            fs.mkdirSync(dir);
        }
        // Make a request for the file
        const downloadFile = async (asset,index) => {
            const filePath = path.join(dir, asset.name);
            try {

            const response = await axios({
                method: 'get',
                url: asset.url,
                responseType: 'stream'
            });

            let totalLength = response.headers['content-length'];
            if(isNaN(totalLength))totalLength=1;

            // If the file exists and has the same size, skip it
            if (fs.existsSync(filePath) && fs.statSync(filePath).size === totalLength) {
                console.log(`\nFile ${asset.name} already exists and has the same size. Skipping download.`);
                return;
            }

            let downloadedLength = 0;

            // Create a progress bar
            const progressBar = new ProgressBar('-> downloading :name file '+index+' out of '+assets.length+' [:bar] :percent :etas :downloaded/:lengthTotal MB', {
                width: 40,
                name: asset.name,
                complete: '=',
                incomplete: ' ',
                renderThrottle: 1,
                total: parseInt(totalLength),
                downloaded: (downloadedLength/1024/1024).toFixed(4),
                lengthTotal:(totalLength/1024/1024).toFixed(4)
            });

            const file = fs.createWriteStream(filePath);

            response.data.on('data', (chunk) => {
                downloadedLength += chunk.length;
                progressBar.tick(chunk.length,{downloaded: (downloadedLength/1024/1024).toFixed(4),
                    lengthTotal:(totalLength/1024/1024).toFixed(4),
                    name: asset.name,
                });
            });

            // Pipe the response data to the file
            response.data.pipe(file);

            return new Promise((resolve, reject) => {
                file.on('finish', resolve);
                file.on('error', reject);
            });
            } catch (error) {
                console.error(`Error downloading file: ${error}`);
            }
        };

        // Go through all of the objects in the array
        let index=0
        for (const asset of assets) {
            index++
            // Check if the object has the 'url' property
            if (asset.url) {
                await downloadFile(asset,index);
            }
        }

    }
});

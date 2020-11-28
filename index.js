'use strict';

require('dotenv').config();

const fs = require('fs');
const request = require('request');
const _ = require('lodash');

const PATH_FOLDER_STORE_IMAGE = './folderStoreImage';

const S3 = require('aws-sdk/clients/s3');
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
const bucket = process.env.S3_BUCKET;

const s3 = new S3({
  accessKeyId,
  secretAccessKey,
  params: { Bucket: bucket }
});

const uploadToS3 = (filename, image) => {
  const uploadParams = {
    Bucket: bucket,
    Key: filename,
    Body: image,
    ContentType: 'image'
  };

  // call S3 to retrieve upload file to specified bucket
  s3.upload(uploadParams).promise();
};


const uploadImage = async (filename, imagePath) => {
  await fs.readFile(imagePath, async (err, image) => {

    await uploadToS3(filename, image);
  });
  // Wait until the file is read

  return `https://${bucket}/${filename}`;
};

// call to download image. If image stored your local. Just run handleResults to upload images to s3
const downloadImage = (images, i, results) => {
  if (i < images.length) {
    // generate random filename
    const filename = new Date().toISOString() + _.random(500);
    results.push(`${filename}.png`);
    request(images[i]).pipe(fs.createWriteStream(`${PATH_FOLDER_STORE_IMAGE}/${filename}.png`)).on('close', downloadImage(images, i + 1, results));
  }

  return () => results;
};

const handleResults = async (results) => {
  const urls = await Promise.all(results.map((image) => uploadImage(`locationImages/${image}`, `${PATH_FOLDER_STORE_IMAGE}/${image}`)));
  return urls;
};

async function run() {
  const imageUrls = require('./images.json'); // Get your image urls

  // call to download images. If images stored your local, skip this step (downloadImage function);
  const getResults = await downloadImage(imageUrls, 0, []);


  setTimeout(async () => {
    const results = getResults();

    // upload image to s3 return array url image
    const s3ImageUrls = await handleResults(results);

    // This image urls after upload image to s3 
    console.log(s3ImageUrls);

    // delete image from local
    await Promise.all(results.map((link) => fs.unlink(`${PATH_FOLDER_STORE_IMAGE}/${link}`, () => {
      console.log('deleted');
    })));
  }, 3000);
}

run().then(() => console.log('good'));


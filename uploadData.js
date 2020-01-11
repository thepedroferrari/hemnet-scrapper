const firestoreService = require("firestore-export-import");

// Initiate Firebase App
const importToFirebase = filename => {
  console.log(`Importing ${filename}.json to Firebase`);

  try {
    firestoreService.restore(`./jsonData/${filename}.json`);
  } catch (error) {
    console.log(error);
  }
  console.log("Should be imported by now :)");
};

module.exports = importToFirebase;

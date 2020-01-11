const puppeteer = require("puppeteer");
const chalk = require("chalk");
const fs = require("fs");

const importToFirebase = require("./uploadData");

const error = chalk.bold.red;
const success = chalk.keyword("green");
const consoleLink = chalk.bold.blue;

const scraper = async url => {
  console.log(url);
  const urlParts = url
    .split("-")
    .slice(-1)
    .toString();

  const objectID = urlParts.split("_")[0];

  const urlParameters = urlParts.split("_")[1];

  const userID = urlParameters.split("=")[1];

  const link = url.split("_")[0];
  try {
    // open the headless browser
    const browser = await puppeteer.launch({ headless: true });
    // open a new page
    const page = await browser.newPage();
    // enter url in page
    await page.goto(`https://www.hemnet.se/bostad/${link}`);
    await page.setViewport({
      width: 1200,
      height: 2000
    });
    // lets wait until this loads so we can be sure we can extract the data
    await page.waitForSelector(".property-attributes-table__label");

    await page.evaluate(async () => {
      await new Promise((resolve, reject) => {
        let totalHeight = 0;
        let distance = 100;
        let timer = setInterval(() => {
          let scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;
          if (totalHeight >= scrollHeight) {
            setInterval(() => {}, 1000);
            clearInterval(timer);
            resolve();
          }
        }, 33);
      });
    });

    const scrapeHome = await page.evaluate(
      (userID, objectID) => {
        // These are the fields we want to scrape or determine.
        const objectInformation = {
          [userID]: {
            [objectID]: {
              address: "",
              area: 0,
              association: "",
              associationScore: "",
              balcony: "",
              description: "",
              elevator: "",
              link: "",
              monthlyCost: 0,
              operationalCostYear: 0,
              price: 0,
              rooms: 0,
              squareMeterPrice: 0,
              tenure: "",
              type: "",
              year: 0,
              scoreAccess: 0,
              scoreBalcony: 0,
              scoreBathroom: 0,
              scoreBedroom: 0,
              scoreCeilingHeight: 0,
              scoreCloset: 0,
              scoreEnergyAndOutlets: 0,
              scoreEntrance: 0,
              scoreFloor: 0,
              scoreGutFeeling: 0,
              scoreKidsFriendly: 0,
              scoreKitchen: 0,
              scoreLaundryRoom: 0,
              scoreLayout: 0,
              scoreLivingRoom: 0,
              scoreNoiseLevel: 0,
              scoreParking: 0,
              scorePetsFriendly: 0,
              scorePhysicalCondition: 0,
              scoreRenovationRules: 0,
              scoreSecurity: 0,
              scoreStorage: 0,
              scoreSurroundings: 0,
              scoreTimeToCityCenter: 0,
              scoreTimeToComute: 0,
              scoreView: 0,
              scoreWaterDistance: 0
            }
          }
        };
        // This is the main Table we get Labels and Values from
        const infoTable = Array.from(
          document.querySelectorAll(".property-attributes-table__area")
        );
        if (!infoTable) return;
        const homeInfo = objectInformation[userID][objectID];

        // Get the Address
        const addressElement = document.querySelector(
          ".property-address__street"
        );
        if (addressElement) {
          const address = addressElement.textContent;
          homeInfo.address = address;
        }

        // Get the association score
        let associationScore = document.querySelector(
          'span[class*="housing-cooperative__rating--"]'
        );
        if (associationScore) {
          homeInfo.associationScore = associationScore.textContent;
        }

        // Get the Description
        const description = document.querySelector(".js-property-description");
        if (description) {
          homeInfo.description = description.textContent.trim();

          // Check for clues wether it may have a balcony
          const balconyKeywords = ["balkong", "balkongen"];
          const lowerDescription = String(description.textContent)
            .trim()
            .toLowerCase();
          balconyKeywords.forEach(word => {
            const found = lowerDescription.includes(word);
            if (found) homeInfo.balcony = "probably";
          });
        }

        // Get the Link
        const link = window.location.href;
        homeInfo.link = link;

        // Get the Price
        const priceElement = document.querySelector(".qa-property-price");
        let price;
        if (priceElement) {
          const priceText = priceElement.textContent;
          price = Number(priceText.replace("kr", "").replace(/\s/g, ""));
          homeInfo.price = price;
        }

        // We are looping through the table and getting values from it
        infoTable.forEach(row => {
          // Get a list of labels
          const labelColumn = Array.from(
            row.querySelectorAll(".property-attributes-table__label")
          );

          // Loop through the labels
          labelColumn.forEach(label => {
            // get the label text
            const labelText = String(label.textContent).trim();

            // Set the value to being the sibling element of the current label
            const labelSibling = label.parentElement.querySelector("dd");

            // We don't want labels we haven't set on the Map, also not empty values
            if (!labelText || !labelSibling) return;

            // Mapping one by one since this is not an API and we can't be sure of stuff

            // Type of Object
            if (labelText === "Bostadstyp") {
              const objectType = String(labelSibling.textContent).trim();
              homeInfo.type = objectType;
            }

            // Balcony
            if (labelText === "Balkong") {
              const objectType = String(labelSibling.textContent).trim();
              if (objectType === "Ja") {
                homeInfo.balcony = "Yes";
              } else {
                homeInfo.balcony = "No";
              }
            }

            // Tenure
            if (labelText === "Upplåtelseform") {
              homeInfo.tenure = String(labelSibling.textContent).trim();
            }

            // Rooms
            if (labelText === "Antal rum") {
              const value = labelSibling.textContent;
              if (!value) return;
              const numericValue = Number(
                value.replace(" rum", "").replace(",", ".")
              );
              homeInfo.rooms = numericValue;
            }

            // Elevator
            if (labelText === "Hiss") {
              homeInfo.elevator = String(labelSibling.textContent).trim();
            }

            // Area SQM
            if (labelText === "Boarea") {
              const value = labelSibling.textContent;
              if (!value) return;
              const numericValue = Number(
                value.replace(" m²", "").replace(",", ".")
              );
              homeInfo.area = numericValue;
            }

            // Year Built
            if (labelText === "Byggår") {
              const value = labelSibling.textContent;
              if (!value) return;
              const numericValue = Number(value);
              homeInfo.year = numericValue;
            }

            // Association
            if (labelText === "Förening") {
              const value = String(labelSibling.textContent)
                .replace("Om föreningen", "")
                .trim();
              homeInfo.association = value;
            }

            // Monthly Bill
            if (labelText === "Avgift") {
              const value = labelSibling.textContent;
              if (!value) return;
              const numericValue = Number(
                value.replace("kr/mån", "").replace(/\s/g, "")
              );
              homeInfo.monthlyCost = numericValue;
            }

            // Approximate Operational Cost per Year
            if (labelText === "Driftkostnad") {
              const value = labelSibling.textContent;
              if (!value) return;
              const numericValue = Number(
                value
                  .replace("kr/mån", "")
                  .replace("kr/år", "")
                  .replace(/\s/g, "")
              );
              homeInfo.operationalCostYear = numericValue;
            }

            if (price && homeInfo.area) {
              homeInfo.squareMeterPrice = Math.round(price / homeInfo.area);
            }
          });
        });
        return objectInformation;
      },
      userID,
      objectID
    );
    await browser.close();

    // Writing the objectInformation data inside a json file
    fs.writeFile(
      `./jsonData/${userID}.json`,
      JSON.stringify(scrapeHome),
      function(err) {
        if (err) throw err;
        console.log("Saved!");
        console.log(`Attempting to import to:`);
        console.log(
          consoleLink(
            `https://console.firebase.google.com/u/0/project/home-auditor/database/firestore/data~2F${userID}~2F${objectID}`
          )
        );
        importToFirebase(userID);
      }
    );
    console.log(success("Browser Closed"));
  } catch (err) {
    // Catch and display errors
    console.log(error(err));
    await puppeteer.browser.close();
    console.log(error("Browser Closed"));
  }
};

module.exports = scraper;

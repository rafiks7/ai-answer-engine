import axios from "axios";
import * as cheerio from "cheerio";
import puppeteer from "puppeteer";

const getTopResultsFromGoogle = async (
  query: string,
  filter: number = 3
): Promise<{ title: string; link: string }[]> => {
  try {
    const response = await axios.get(
      `https://www.google.com/search?q=${query}`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/93.0.4577.82 Safari/537.36",
        },
      }
    );

    const html = response.data;
    const $ = cheerio.load(html);
    const searchResults: { title: string; link: string }[] = [];

    for (let i = 0; i < filter; i++) {
      const title = $(`h3`).eq(i).text();
      const link = $(`h3`).eq(i).parent().attr("href");
      if (title && link) {
        searchResults.push({ title, link });
      }
    }
    return searchResults;
  } catch (error) {
    console.error("Error fetching search results:", error);
    return [];
  }
};

async function determineScrapingMethod(
  url: string
): Promise<"cheerio" | "puppeteer"> {
  try {
    // Fetch the page
    const response = await fetch(url);
    const html = await response.text();

    // Indicators for client-side rendering or dynamic content
    const needsPuppeteer = [
      "window.__INITIAL_STATE__",
      "window.__NUXT__",
      "window.__NEXT_DATA__",
      "react",
      "angular",
      "vue",
      "_next/static",
      "data-reactroot",
      "data-v-",
      "<script src=",
    ].some(indicator => html.includes(indicator));

    return needsPuppeteer ? "puppeteer" : "cheerio";
  } catch (error) {
    console.error("Error detecting scraping method:", error);
    // Default to Puppeteer on fetch error
    return "puppeteer";
  }
}

const selectors = [
  "article",
  "main",
  ".content",
  "#content",
  ".post",
  ".article",
  '[role="main"]',
];

const scrapeWithPuppeteer = async (url: string): Promise<string> => {
  try {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(url);

    // Get the page content
    const content = await page.content();

    // Use Cheerio to parse the HTML content
    const $ = cheerio.load(content);

    // Remove unwanted elements like ads, navigation bars, etc.
    $("script").remove(); // Remove all <script> tags
    $("style").remove(); // Remove all <style> tags
    $("header").remove(); // Remove <header> tags
    $("footer").remove(); // Remove <footer> tags
    $("aside").remove(); // Remove <aside> tags
    $("nav").remove(); // Remove <nav> tags

    // If you need to extract the main content, you can target specific selectors like 'article', 'main', or others.
    let mainContent =
      $("article").text() || $("main").text() || $("body").text();

    // Clean up the text content
    mainContent = mainContent.replace(/\s+/g, " ").trim(); // Remove excessive whitespace

    await browser.close();

    console.log("cleaned puppeteer content:", mainContent);

    return mainContent.slice(0, 10000); // Return the first 10,000 characters of cleaned content
  } catch (error) {
    console.error("Error scraping with Puppeteer:", error);
    return "no content found";
  }
};

const scrapeWithCheerio = async (url: string): Promise<string> => {
  try {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    const title = $("title").text();
    let webContent = ``;
    selectors.forEach(selector => {
      const content = $(selector).text();
      webContent += `${content}\n`;
    });
    console.log("full cheerio content:", webContent);
    return webContent.slice(0, 10000);
  } catch (error) {
    console.error("Error scraping with Cheerio:", error);
    return "no content found";
  }
};

const scrapeWebPage = async (url: string): Promise<string> => {
  const method = await determineScrapingMethod(url);
  console.log("scraping method:", method);
  if (method === "puppeteer") {
    return scrapeWithPuppeteer(url);
  } else {
    return scrapeWithCheerio(url);
  }
};

export { getTopResultsFromGoogle, scrapeWebPage };

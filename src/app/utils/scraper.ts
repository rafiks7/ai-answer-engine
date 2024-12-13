import axios from "axios";
import * as cheerio from "cheerio";


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

const scrapeWebPage = async (url: string): Promise<string> => {
    // const browser = await puppeteer.launch();
    // const page = await browser.newPage();
    // await page.goto(url);
    // // get the page content
    // const content = await page.content();
    // await browser.close();
    // return content;
    return "This is a placeholder for the scraped content";
  };

export { getTopResultsFromGoogle, scrapeWebPage };
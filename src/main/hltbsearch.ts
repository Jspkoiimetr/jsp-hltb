import UserAgent from "npm:user-agents@1.1.328";
import { DOMParser } from "jsr:@b-fuze/deno-dom@0.1.48";

/**
 * Takes care about the http connection and response handling
 */
export class HltbSearch {
    public static BASE_URL = "https://howlongtobeat.com/";
    public static REFERER_HEADER = HltbSearch.BASE_URL;
    public static SEARCH_URL = HltbSearch.BASE_URL + "api/search";
    public static GAME_URL = HltbSearch.BASE_URL + "game/";
    public static IMAGE_URL: string = `${HltbSearch.BASE_URL}games/`;

    payload: any = {
        searchType: "games",
        searchTerms: [],
        searchPage: 1,
        size: 20,
        searchOptions: {
            games: {
                userId: 0,
                platform: "",
                sortCategory: "popular",
                rangeCategory: "main",
                rangeTime: {
                    min: 0,
                    max: 0,
                },
                gameplay: {
                    perspective: "",
                    flow: "",
                    genre: "",
                },
                modifier: "",
            },
            users: {
                sortCategory: "postcount",
            },
            filter: "",
            sort: 0,
            randomizer: 0,
        },
    };

    async sendWebsiteRequestGetCode(
        parseAllScripts: boolean,
    ): Promise<string | null> {
        try {
            const headers = {
                "User-Agent": new UserAgent().toString(),
                "referer": HltbSearch.REFERER_HEADER,
            };

            const response = await fetch(HltbSearch.BASE_URL, { headers });
            if (!response.ok) return null;

            const text = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(text, "text/html");

            const scripts = doc?.querySelectorAll("script[src]");
            const matchingScripts: (string | null)[] = Array.from(scripts || [])
                .map((script) => script.getAttribute("src"))
                .filter((src) =>
                    src && (parseAllScripts || src.includes("_app-"))
                );

            // Fetch all scripts in parallel
            const scriptResponses = await Promise.all(
                matchingScripts.map((scriptUrl) =>
                    fetch(`${HltbSearch.BASE_URL}${scriptUrl}`, { headers })
                        .then((res) => res.ok ? res.text() : null)
                ),
            );

            const pattern = /\/api\/search\/".concat\("([a-zA-Z0-9]+)"\)/g;

            // Search for matches in all scripts
            for (const scriptText of scriptResponses) {
                if (scriptText) {
                    const matches = scriptText.match(pattern);
                    if (matches) {
                        return matches.map((match) =>
                            match.match(/"([a-zA-Z0-9]+)"/)![1]
                        )[0];
                    }
                }
            }
        } catch (error) {
            console.error("Error fetching the website:", error);
        }
        return null;
    }

    async detailHtml(gameId: string): Promise<string | undefined> {
        try {
            const result = await fetch(`${HltbSearch.GAME_URL}${gameId}`, {
                headers: {
                    "content-type": "text/html",
                    "accept": "*/*",
                    "User-Agent": new UserAgent().toString(),
                    "referer": HltbSearch.REFERER_HEADER,
                },
            }).catch((e) => {
                throw e;
            });
            return await result.text();
        } catch (error: any) {
            if (error) {
                throw new Error(error);
            } else if (error.response.status !== 200) {
                throw new Error(
                    `Got non-200 status code from howlongtobeat.com [${error.response.status}]
          ${JSON.stringify(error.response)}
        `,
                );
            }
        }
    }

    async search(query: Array<string>): Promise<any> {
        // Use built-in javascript URLSearchParams as a drop-in replacement to create axios.post required data param
        const search = { ...this.payload };
        search.searchTerms = query;

        let apiKeyResult = await this.sendWebsiteRequestGetCode(false);
        if (!apiKeyResult) {
            apiKeyResult = await this.sendWebsiteRequestGetCode(true);
        }

        try {
            const result = await fetch(
                HltbSearch.SEARCH_URL + "/" + apiKeyResult,
                {
                    headers: {
                        "User-Agent": new UserAgent().toString(),
                        "content-type": "application/json",
                        "origin": "https://howlongtobeat.com/",
                        "referer": "https://howlongtobeat.com/",
                    },
                    method: "POST",
                    body: JSON.stringify(search),
                },
            );
            // console.log('Result', JSON.stringify(result.data));
            return await result.json();
        } catch (error: any) {
            if (error) {
                throw new Error(error);
            } else if (error.response.status !== 200) {
                throw new Error(
                    `Got non-200 status code from howlongtobeat.com [${error.response.status}]
          ${JSON.stringify(error.response)}
        `,
                );
            }
        }
    }
}

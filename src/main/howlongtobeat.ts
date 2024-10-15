import levenshtein from "npm:fast-levenshtein@3.0.0";
import { DOMParser } from "jsr:@b-fuze/deno-dom@0.1.48";

import { HltbSearch } from "./hltbsearch.ts";

export class HowLongToBeatService {
    private hltb: HltbSearch = new HltbSearch();

    constructor() {
    }

    /**
     * Get HowLongToBeatEntry from game id, by fetching the detail page like https://howlongtobeat.com/game.php?id=6974 and parsing it.
     * @param gameId the hltb internal gameid
     * @return Promise<HowLongToBeatEntry> the promise that, when fullfilled, returns the game
     */
    async detail(gameId: string): Promise<HowLongToBeatEntry> {
        const detailPage = await this.hltb.detailHtml(
            gameId,
        );
        if (detailPage === undefined) {
            return Promise.reject("Error fetching the website");
        }
        return HowLongToBeatParser.parseDetails(detailPage, gameId);
    }

    async search(query: string): Promise<Array<HowLongToBeatEntry>> {
        const searchTerms = query.split(" ");
        const search = await this.hltb.search(
            searchTerms,
        );
        // console.log(`Found ${search.count} results`);
        return search.data.map((resultEntry: any) => ({
            id: String(resultEntry.game_id), // game id is now a number, but I want to keep the model stable
            name: resultEntry.game_name,
            description: "", // no description
            platforms: resultEntry.profile_platform
                ? resultEntry.profile_platform.split(", ")
                : [],
            imageUrl: `${HltbSearch.IMAGE_URL}${resultEntry.game_image}`,
            timeLabels: [["Main", "Main"], ["Main + Extra", "Main + Extra"], [
                "Completionist",
                "Completionist",
            ]],
            gameplayMain: Math.round(resultEntry.comp_main / 3600),
            gameplayMainExtra: Math.round(resultEntry.comp_plus / 3600),
            gameplayCompletionist: Math.round(resultEntry.comp_100 / 3600),
            similarity: HowLongToBeatService.calcDistancePercentage(
                resultEntry.game_name,
                query,
            ),
            searchTerm: query,
        }));
    }

    /**
     * Calculates the similarty of two strings based on the levenshtein distance in relation to the string lengths.
     * It is used to see how similar the search term is to the game name. This, of course has only relevance if the search term is really specific and matches the game name as good as possible.
     * When using a proper search index, this would be the ranking/rating and much more sophisticated than this helper.
     * @param text the text to compare to
     * @param term the string of which the similarity is wanted
     */
    static calcDistancePercentage(text: string, term: string): number {
        let longer: string = text.toLowerCase().trim();
        let shorter: string = term.toLowerCase().trim();
        if (longer.length < shorter.length) {
            // longer should always have
            // greater length
            const temp: string = longer;
            longer = shorter;
            shorter = temp;
        }
        const longerLength: number = longer.length;
        if (longerLength == 0) {
            return 1.0;
        }
        const distance = levenshtein.get(longer, shorter);
        return Math.round(((longerLength - distance) / longerLength) * 100) /
            100;
    }
}

/**
 * Encapsulates a game detail
 */
export interface HowLongToBeatEntry {
    id: string;
    name: string;
    description: string;
    platforms: string[];
    imageUrl: string;
    timeLabels: Array<string[]>;
    gameplayMain: number;
    gameplayMainExtra: number;
    gameplayCompletionist: number;
    similarity: number;
    searchTerm: string;
}

/**
 * Internal helper class to parse html and create a HowLongToBeatEntry
 */
export class HowLongToBeatParser {
    /**
     * Parses the passed html to generate a HowLongToBeatyEntrys.
     * All the dirty DOM parsing and element traversing is done here.
     * @param html the html as basis for the parsing. taking directly from the response of the hltb detail page
     * @param id the hltb internal id
     * @return HowLongToBeatEntry representing the page
     */
    /*static parseDetails(html: string, id: string): HowLongToBeatEntry {
        const $ = cheerio.load(html);
        let gameName = "";
        let imageUrl = "";
        let timeLabels: Array<string[]> = new Array<string[]>();
        let gameplayMain = 0;
        let gameplayMainExtra = 0;
        let gameplayComplete = 0;

        gameName = ($("div[class*=GameHeader_profile_header__]")[
            0
        ] as cheerio.TagElement).children[0].data!.trim();
        imageUrl =
            (($("div[class*=GameHeader_game_image__]")[0] as cheerio.TagElement)
                .children[0] as cheerio.TagElement).attribs.src;

        let liElements = $("div[class*=GameStats_game_times__] li");
        const gameDescription = $(
            ".in.back_primary.shadow_box div[class*=GameSummary_large__]",
        ).text();

        let platforms: string[] = [];
        $("div[class*=GameSummary_profile_info__]").each(
            function (this: HTMLElement) {
                const metaData = $(this).text();
                if (metaData.includes("Platforms:")) {
                    platforms = metaData
                        .replace(/\n/g, "")
                        .replace("Platforms:", "")
                        .split(",")
                        .map((data) => data.trim());
                    return;
                }
            },
        );

        liElements.each(function (this: HTMLElement) {
            let type: string = $(this)
                .find("h4")
                .text();
            let time: number = HowLongToBeatParser.parseTime(
                $(this)
                    .find("h5")
                    .text(),
            );
            if (
                type.startsWith("Main Story") ||
                type.startsWith("Single-Player") ||
                type.startsWith("Solo")
            ) {
                gameplayMain = time;
                timeLabels.push(["gameplayMain", type]);
            } else if (
                type.startsWith("Main + Sides") || type.startsWith("Co-Op")
            ) {
                gameplayMainExtra = time;
                timeLabels.push(["gameplayMainExtra", type]);
            } else if (
                type.startsWith("Completionist") || type.startsWith("Vs.")
            ) {
                gameplayComplete = time;
                timeLabels.push(["gameplayComplete", type]);
            }
        });

        return {
            id: id,
            name: gameName,
            description: gameDescription,
            platforms: platforms,
            imageUrl: imageUrl,
            timeLabels: timeLabels,
            gameplayMain: gameplayMain,
            gameplayMainExtra: gameplayMainExtra,
            gameplayCompletionist: gameplayComplete,
            similarity: 1,
            searchTerm: gameName,
        };
    }*/
    static parseDetails(html: string, id: string): HowLongToBeatEntry {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");

        let gameName = "";
        let imageUrl = "";
        const timeLabels: Array<string[]> = [];
        let gameplayMain = 0;
        let gameplayMainExtra = 0;
        let gameplayComplete = 0;

        const gameHeader = doc.querySelector(
            "div[class*=GameHeader_profile_header__]",
        );
        if (gameHeader) {
            gameName = gameHeader.textContent!.trim();
        }

        const gameImage = doc.querySelector(
            "div[class*=GameHeader_game_image__] img",
        );
        if (gameImage) {
            imageUrl = gameImage.getAttribute("src") || "";
        }

        const liElements = doc.querySelectorAll(
            "div[class*=GameStats_game_times__] li",
        );
        const gameDescription = doc.querySelector(
            ".in.back_primary.shadow_box div[class*=GameSummary_large__]",
        )?.textContent || "";

        let platforms: string[] = [];
        const profileInfoDivs = doc.querySelectorAll(
            "div[class*=GameSummary_profile_info__]",
        );
        profileInfoDivs.forEach((div) => {
            const metaData = div.textContent || "";
            if (metaData.includes("Platforms:")) {
                platforms = metaData
                    .replace(/\n/g, "")
                    .replace("Platforms:", "")
                    .split(",")
                    .map((data) => data.trim());
            }
        });

        liElements.forEach((li) => {
            const type = li.querySelector("h4")?.textContent || "";
            const time = HowLongToBeatParser.parseTime(
                li.querySelector("h5")?.textContent || "",
            );

            if (
                type.startsWith("Main Story") ||
                type.startsWith("Single-Player") || type.startsWith("Solo")
            ) {
                gameplayMain = time;
                timeLabels.push(["gameplayMain", type]);
            } else if (
                type.startsWith("Main + Sides") || type.startsWith("Co-Op")
            ) {
                gameplayMainExtra = time;
                timeLabels.push(["gameplayMainExtra", type]);
            } else if (
                type.startsWith("Completionist") || type.startsWith("Vs.")
            ) {
                gameplayComplete = time;
                timeLabels.push(["gameplayComplete", type]);
            }
        });

        return {
            id: id,
            name: gameName,
            description: gameDescription,
            platforms: platforms,
            imageUrl: imageUrl,
            timeLabels: timeLabels,
            gameplayMain: gameplayMain,
            gameplayMainExtra: gameplayMainExtra,
            gameplayCompletionist: gameplayComplete,
            similarity: 1,
            searchTerm: gameName,
        };
    }

    /**
     * Utility method used for parsing a given input text (like
     * &quot;44&#189;&quot;) as double (like &quot;44.5&quot;). The input text
     * represents the amount of hours needed to play this game.
     *
     * @param text
     *            representing the hours
     * @return the pares time as double
     */
    private static parseTime(text: string): number {
        // '65&#189; Hours/Mins'; '--' if not known
        if (text.startsWith("--")) {
            return 0;
        }
        if (text.indexOf(" - ") > -1) {
            return HowLongToBeatParser.handleRange(text);
        }
        return HowLongToBeatParser.getTime(text);
    }

    /**
     * Parses a range of numbers and creates the average.
     * @param text
     *            like '5 Hours - 12 Hours' or '2½ Hours - 33½ Hours'
     * @return the arithmetic median of the range
     */
    private static handleRange(text: string): number {
        const range: Array<string> = text.split(" - ");
        return (HowLongToBeatParser.getTime(range[0]) +
            HowLongToBeatParser.getTime(range[1])) /
            2;
    }

    /**
     * Parses a string to get a number
     * @param text can be '12 Hours' or '5½ Hours' or '50 Mins'
     * @return the time, parsed from text
     */
    private static getTime(text: string): number {
        //check for Mins, then assume 1 hour at least
        const timeUnit = text.substring(text.indexOf(" ") + 1).trim();
        if (timeUnit === "Mins") {
            return 1;
        }
        const time: string = text.substring(0, text.indexOf(" "));
        if (time.indexOf("½") > -1) {
            return 0.5 + parseInt(time.substring(0, text.indexOf("½")));
        }
        return parseInt(time);
    }
}

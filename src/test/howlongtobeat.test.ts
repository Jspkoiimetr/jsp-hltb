import { assertExists, assertStrictEquals } from "jsr:@std/assert";
import {
    HowLongToBeatParser,
    HowLongToBeatService,
} from "../main/howlongtobeat.ts";

Deno.test("Test for calcDistancePercentage()", async (t) => {
    await t.step(
        "dark souls and dark souls should have 100% similarity",
        () => {
            const perc = HowLongToBeatService.calcDistancePercentage(
                "Dark Souls",
                "Dark Souls",
            );
            assertStrictEquals(perc, 1);
        },
    );

    await t.step(
        "dark souls and dark soul should have 90% similarity",
        () => {
            const perc = HowLongToBeatService.calcDistancePercentage(
                "Dark Souls",
                "Dark Soul",
            );
            assertStrictEquals(perc, 0.9);
        },
    );
});

Deno.test("Testing HowLongToBeatParser", async (t) => {
    await t.step(
        "Test for parseDetail, if this succeeds, but live installment fails, howlongtobeat.com may have changed their html",
        async () => {
            const html = await Deno.readTextFile(
                "./src/test/resources/detail_gow3.html",
            );
            const detail = HowLongToBeatParser.parseDetails(html, "3978");
            assertExists(detail);
            assertStrictEquals(detail.name, "God of War III");
            assertStrictEquals(detail.searchTerm, "God of War III");
            assertStrictEquals(detail.similarity, 1);
            assertStrictEquals(detail.platforms.length, 2);
            assertStrictEquals(detail.gameplayCompletionist, 17.5);
            assertStrictEquals(detail.gameplayMain, 10);
            assertStrictEquals(detail.gameplayMainExtra, 11);
        },
    );

    await t.step(
        "Test for parsing minutes correctly from detail page. Example is Street Fighter which claims to take 1 Hours to beat (main)",
        async () => {
            const html = await Deno.readTextFile(
                "./src/test/resources/detail_street_fighter.html",
            );
            const detail = HowLongToBeatParser.parseDetails(html, "9224");
            assertExists(detail);
            assertStrictEquals(detail.name, "Street Fighter");
            assertStrictEquals(detail.searchTerm, "Street Fighter");
            assertStrictEquals(detail.similarity, 1);
            // should be one, since 1 hours is the minimum
            assertStrictEquals(detail.gameplayMain, 1);
            assertStrictEquals(detail.gameplayMainExtra, 2.5);
            assertStrictEquals(detail.gameplayCompletionist, 4);
        },
    );

    await t.step(
        "Test for parsing minutes correctly from detail page. Example is Guns of Icarus Online which does not have Co-Op time but it has Vs.",
        async () => {
            const html = await Deno.readTextFile(
                "./src/test/resources/detail_guns_of_icarus_online.html",
            );
            const detail = HowLongToBeatParser.parseDetails(html, "4216");
            assertExists(detail);
            assertStrictEquals(detail.name, "Guns of Icarus Online");
            assertStrictEquals(detail.searchTerm, "Guns of Icarus Online");
            assertStrictEquals(detail.similarity, 1);
            // should be one, since 1 hours is the minimum
            assertStrictEquals(detail.gameplayMain, 0);
            assertStrictEquals(detail.gameplayMainExtra, 0);
            assertStrictEquals(detail.gameplayCompletionist, 26);
        },
    );
});

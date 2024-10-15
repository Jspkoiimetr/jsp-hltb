import {
    assert,
    assertEquals,
    assertExists,
    assertGreater,
    assertGreaterOrEqual,
    assertStrictEquals,
    assertStringIncludes,
} from "jsr:@std/assert";
import { HowLongToBeatService } from "../main/howlongtobeat.ts";

Deno.test("assert works correctly", () => {
    assert(true);
    assertEquals(1, 1);
});

Deno.test("Integration-Testing HowLongToBeatService", async (t) => {
    await t.step(
        "Test for detail()",
        async (t) => {
            await t.step(
                "should load entry for 2224 (Dark Souls)",
                async () => {
                    const entry = await new HowLongToBeatService().detail(
                        "2224",
                    );
                    // console.log(entry);
                    assertExists(entry);
                    assertStrictEquals(entry.id, "2224");
                    assertStrictEquals(entry.name, "Dark Souls");
                    assertStrictEquals(entry.searchTerm, "Dark Souls");
                    assert(typeof entry.imageUrl === "string");
                    assert(Array.isArray(entry.platforms));
                    assertStrictEquals(entry.platforms.length, 3);
                    assertStringIncludes(
                        entry.description,
                        "Live Through A Million Deaths & Earn Your Legacy.",
                    );
                    assertGreater(entry.gameplayMain, 40);
                    assertGreater(entry.gameplayCompletionist, 100);
                },
            );

            await t.step(
                "should fail to load entry for 123 (404)",
                async () => {
                    const test = await new HowLongToBeatService().detail("123");
                    assertStrictEquals(test.name, "");
                    assertStrictEquals(test.description, "");
                    assertStrictEquals(test.platforms.length, 0);
                    assertStrictEquals(test.imageUrl, "");
                    assertStrictEquals(test.timeLabels.length, 0);
                },
            );
        },
    );

    await t.step(
        "Test for search()",
        async (t) => {
            await t.step(
                "should have no search results when searching for dorks",
                async () => {
                    const result = await new HowLongToBeatService().search(
                        "dorks",
                    );
                    assertExists(result);
                    assertStrictEquals(result.length, 0);
                },
            );

            await t.step(
                "should have at least 3 search results when searching for dark souls III",
                async () => {
                    const result = await new HowLongToBeatService().search(
                        "dark souls III",
                    );
                    assertExists(result);
                    assertGreaterOrEqual(result.length, 3);
                    assertStrictEquals(result[0].id, "26803");
                    assertStrictEquals(result[0].name, "Dark Souls III");
                    assertGreater(result[0].gameplayMain, 30);
                    assertGreater(result[0].gameplayCompletionist, 80);
                },
            );

            await t.step(
                "should have 1 search results with 100% similarity when searching for Persona 4: Golden",
                async () => {
                    const result = await new HowLongToBeatService().search(
                        "Persona 4 Golden",
                    );
                    assertExists(result);
                    assertStrictEquals(result.length, 1);
                    assertStrictEquals(result[0].similarity, 1);
                },
            );

            await t.step(
                'Entries without any time settings (e.g. "Surge") should have a zero hour result',
                async () => {
                    const result = await new HowLongToBeatService().search(
                        "Surge",
                    );
                    assertExists(result);
                    assertGreater(result.length, 1);
                    assertStrictEquals(result[0].gameplayMain, 0);
                },
            );
        },
    );
});

/*
describe("Integration-Testing HowLongToBeatService", () => {

    describe("Test for search()", () => {

        test('Entries without any time settings (e.g. "Surge") should have a zero hour result', () => {
            return new HowLongToBeatService().search("Surge").then((result) => {
                // console.log(result);
                expect(result).not.toBeNull();
                expect(result.length).toBeGreaterThan(1);
                expect(result[0].gameplayMain).toStrictEqual(0);
            });
        });
    });
});
*/

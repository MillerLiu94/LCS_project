import { expect, test } from "@playwright/test";

const selectedRegion = "臺北市中正區";
const events = [
  {
    id: "taipei-1",
    type: "路燈故障",
    title: "中正路路燈故障",
    placeText: "臺北市中正區中山南路 21 號",
    status: "pending",
    description: "中正區路燈故障",
  },
  {
    id: "newtaipei-1",
    type: "垃圾堆置",
    title: "板橋垃圾堆置",
    placeText: "新北市板橋區文化路 50 號",
    status: "pending",
    description: "板橋區垃圾堆置",
  },
];

function matchesRegion(event, region) {
  return [event.placeText, event.title, event.type].some((value) => value.includes(region));
}

test("附近案件頁只顯示選定地區的案件", async ({ page }) => {
  await page.addInitScript((region) => {
    sessionStorage.setItem("communityLocalInfoLocation", JSON.stringify({ address: region }));
  }, selectedRegion);

  await page.route("**/api/runtime-config.js", (route) => route.fulfill({
    contentType: "application/javascript",
    body: 'window.CommunityConfig = Object.freeze({ apiBaseUrl: "/api", lineLoginPath: "/auth/line/login" });',
  }));
  await page.route(/\/api\/events(?:\?.*)?$/, async (route) => {
    const url = new URL(route.request().url());
    const filterRegion = url.searchParams.get("filterRegion");
    const region = url.searchParams.get("region");
    let result = events;

    if (filterRegion) result = result.filter((event) => matchesRegion(event, filterRegion));
    else if (region) result = [...result].sort((a, b) => Number(matchesRegion(b, region)) - Number(matchesRegion(a, region)));

    await route.fulfill({ json: result });
  });

  await page.goto("pages/local-info/cases.html");

  await expect(page.locator("#case-region")).toHaveText(selectedRegion);
  await expect(page.getByRole("heading", { level: 2, name: "中正路路燈故障" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "板橋垃圾堆置" })).toHaveCount(0);
});

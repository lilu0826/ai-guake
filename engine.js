import puppeteer from "puppeteer";
import { fun } from  "./inject.js";
import { upsertUserData, } from "./db.js";
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function run(username, password) {
    const browser = await puppeteer.launch({
        headless: true, // true = 无头模式（默认）
        protocolTimeout: 0,
    });

    const page = await browser.newPage();
    await page.setViewport({
        width: 1280,
        height: 600,
    });

    await page.goto(
        "https://basic.sc.smartedu.cn/ThirdPortalService/user/otherlogin!login.ac?appkey=C56DA16ECBC56FBEEC908DA09E45C72C917A80118F057FA1F0B5BAE41CC9CC9DECD5BDB7133FE17C328C5D37B37CA8E7&pkey=5D79CA42E45C5273DF8532D09E1F158B15E25919CDB958940F84D5E63F5F53A1ECD5BDB7133FE17C328C5D37B37CA8E7&params=718F83A5347CBFDB7D1A9065FA090FE949D92330BB9A3351FE0715C5B8A3E86F37916C1004E835C7C7F964E3F301477F7D37F04485FA8707845DAAA23356236ED1D326CF5A5E3C263470516EE9B4A2ED",
        {
            waitUntil: "networkidle2",
        }
    );

    await page.waitForSelector(".submit-btn");

    await page.type("#loginName", username);
    await page.type("#password", password);

    await page.click(".submit-btn");

    const isLogin = await Promise.race([
        page.waitForNavigation().then(() => true),
        (async () => {
            const tips = await page.waitForSelector(".layui-layer-btn0", {
                timeout: 5000,
            });
            const text = await page.evaluate((el) => el.innerText, tips);
            if (text === "确定") {
                await page.click(".layui-layer-btn1");
                await page.waitForNavigation();
                return true;
            }
            return false;
        })(),
    ]);

    console.log("isLogin", isLogin);
    let techerName = Date.now();
    if (isLogin) {

        await upsertUserData({ username, status: "登录成功" })

        await page.waitForSelector(".courseList", {
            visible: true,
            timeout: 15000,
        });

        techerName = await page.evaluate(
            () => document.querySelector("#link > div").innerText
        );

        await upsertUserData({ username, techerName })

        await page.exposeFunction("showMsg", (msg) => {
            console.log(techerName, msg);
        });

        console.log("用户名：", techerName);

        await page.evaluate(fun);

        await page.goto(
            "https://basic.sc.smartedu.cn/hd/teacherTraining/myTrain",
            {
                waitUntil: "networkidle2",
            }
        );
        await page.waitForSelector(".courseList", {
            visible: true,
            timeout: 15000,
        });
    } else {
        await upsertUserData({ username, status: "登录失败" })
    }

    await page.screenshot({ path: `./img/${username}.png` });

    await upsertUserData({ username, img: `/img/${username}.png` })

    await browser.close();
}

export async function start(username, password) {
    while (true) {
        try {
            await run(username, password);
            upsertUserData({ username, status: "学习完成" })
            break;
        } catch (error) {
            console.log("error", error);
            if (error.message == "canceled") {
                break;
            }
            await delay(5000);
        }
    }
}

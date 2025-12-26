export const fun =  async function () {
    Object.keys(window).forEach((key) => {
        if (key.startsWith("webpackChunk")) {
            console.log(key);
            window[key].push([
                [99999],
                {},
                (r) => {
                    window.wr = r;
                },
            ]);
        }
    });
    // 用来挂全局的函数
    function exposeLibs(runtime) {
        if (!runtime) return;
        const exportsMap = {};
        for (const id in runtime.m) {
            let exp = runtime(id);

            const candidate = exp.default || exp;

            if (candidate && candidate.version) {
                console.log("candidate", id, exp);
            }

            // 判断 axios
            if (
                !exportsMap.axios &&
                candidate &&
                candidate.get &&
                candidate.post &&
                candidate.defaults
            ) {
                exportsMap.axios = candidate;
            }

            // 判断 Vue
            if (
                !exportsMap.Vue &&
                candidate &&
                candidate.version &&
                candidate.component &&
                candidate.directive
            ) {
                exportsMap.Vue = candidate;
            }

            // 判断 ElementUI
            if (
                !exportsMap.ElementUI &&
                candidate &&
                candidate.install &&
                candidate.version &&
                candidate.Button
            ) {
                exportsMap.ElementUI = candidate;
            }

            // 提前结束判断
            if (exportsMap.axios && exportsMap.Vue && exportsMap.ElementUI)
                break;
        }

        // 挂到全局
        for (const key in exportsMap) {
            window[key] = exportsMap[key];
            console.log(`✅ ${key} 已挂到 window`);
        }

        return exportsMap;
    }

    // 执行
    exposeLibs(window.wr);

    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    async function getCourseDetails(param) {
        const res = await axios({
            url: "/studyCourse/getCourseDetails?courseId=" + param,
            method: "get",
        });
        return res.returnData;
    }

    async function recordStudyProcess(param) {
        const res = await axios({
            url: "/studyCourseUser/recordProcess",
            method: "post",
            data: param,
        });
        return res.returnData;
    }

    async function study(courseId) {
        const loading = window.Vue.prototype.$loading({
            target: document.querySelector("body"),
            lock: true,
            text: `正在自动学习...`,
            // background: "rgba(0, 0, 0, 0.7)",
        });
        const courseInfo = await getCourseDetails(courseId);
        const chapters = courseInfo.chapters;
        for (const [chapterIndex, chapter] of chapters.entries()) {
            for (const [
                sectionIndex,
                section,
            ] of chapter.studySubsections.entries()) {
                const { courseId, chapterId, id: subsectionId } = section;
                const { state, videoTime } = section.studyFiles;

                loading.text = `正在自动学习：[${courseId}]的${chapterIndex + 1}-${
                    sectionIndex + 1
                    }`;
                showMsg(loading.text)
                if (state != "3") {
                    let recordValue = 0;
                    while (recordValue != 1) {
                        await delay(1000 * 30);
                        recordValue = await recordStudyProcess({
                            courseId: courseId, //课程ID
                            chapterId: chapterId, //章节ID
                            subsectionId: subsectionId, // 子节点ID
                            studyTime: parseInt(videoTime), //观看时间 parseInt(videoTime) + 1
                            state: "2", // 当前状态
                        });
                    }
                }
            }
        }
    }

    const courseList = ["1983723370145034240", "1983474287572594688"];

    for (const courseId of courseList) {
        await study(courseId);
    }
};

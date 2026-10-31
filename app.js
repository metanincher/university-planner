
import { initializeApp }
from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";

import {
    getFirestore,
    collection,
    getDocs,
    addDoc,
    query,
    where
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";


// Firebase設定
const firebaseConfig = {
    apiKey: "AIzaSyAbOQ2XmN_7fEZtVo8IFT9FbwjqkhXViPg",
    authDomain: "university-planner-9c4c6.firebaseapp.com",
    projectId: "university-planner-9c4c6",
    storageBucket: "university-planner-9c4c6.firebasestorage.app",
    messagingSenderId: "124072663091",
    appId: "1:124072663091:web:5efb6cd37e50ecf98aab46"
};


// Firebase初期化
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);


// 科目データを保存する配列
let subjects = [];


// HTML要素
const category1Select = document.getElementById("category1");
const category2Select = document.getElementById("category2");
const subjectSelect = document.getElementById("subject");
const semesterSelect = document.getElementById("semester");
const yearSelect = document.getElementById("academicYear");
const subjectInfo = document.getElementById("subjectInfo");
const registerButton = document.getElementById("registerButton");

// 履修状況表示用HTML要素
const viewYearSelect =
    document.getElementById("viewAcademicYear");

const viewSemesterSelect =
    document.getElementById("viewSemester");

const viewButton =
    document.getElementById("viewButton");

const enrollmentList =
    document.getElementById("enrollmentList");

// プルダウン初期化用関数
function resetSelect(select, disabled = true) {
    select.innerHTML =
        '<option value="">選択してください</option>';
    select.disabled = disabled;
}


// 初期処理
async function init() {

    try {

        const snapshot = await getDocs(
            collection(db, "subjects")
        );

        subjects = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        console.log("取得した科目データ:", subjects);

        // 大カテゴリを取得（重複を除く）
        const categories = [
            ...new Set(subjects.map(s => s.category1))
        ];

        categories.forEach(category => {

            const option = document.createElement("option");
            option.value = category;
            option.textContent = category;

            category1Select.appendChild(option);

        });

        document.getElementById("status").textContent =
            "科目データを読み込みました！";

    } catch (error) {

        document.getElementById("status").textContent =
            "エラー: " + error.message;

        console.error(error);

    }

}


// 登録ボタンの有効・無効を判定
function checkRegisterButton() {

    if (!registerButton) return;

    registerButton.disabled = !(
        yearSelect.value &&
        subjectSelect.value &&
        semesterSelect.value
    );

}


// 大カテゴリ変更時
category1Select.addEventListener("change", () => {

    const category1 = category1Select.value;

    resetSelect(category2Select);
    resetSelect(subjectSelect);
    resetSelect(semesterSelect);

    subjectInfo.replaceChildren();

    checkRegisterButton();

    if (!category1) return;

    // 中カテゴリを絞り込む
    const categories = [
        ...new Set(
            subjects
                .filter(s => s.category1 === category1)
                .map(s => s.category2)
        )
    ];

    categories.forEach(category => {

        const option = document.createElement("option");
        option.value = category;
        option.textContent = category;

        category2Select.appendChild(option);

    });

    category2Select.disabled = false;

});


// 中カテゴリ変更時
category2Select.addEventListener("change", () => {

    const category1 = category1Select.value;
    const category2 = category2Select.value;

    resetSelect(subjectSelect);
    resetSelect(semesterSelect);

    subjectInfo.replaceChildren();

    checkRegisterButton();

    if (!category2) return;

    // 科目を絞り込む
    const filtered = subjects.filter(s =>
        s.category1 === category1 &&
        s.category2 === category2
    );

    filtered.forEach(subject => {

        const option = document.createElement("option");
        option.value = subject.id;
        option.textContent = subject.name;

        subjectSelect.appendChild(option);

    });

    subjectSelect.disabled = false;

});


// 科目変更時
subjectSelect.addEventListener("change", () => {

    const subjectId = subjectSelect.value;

    resetSelect(semesterSelect);
    subjectInfo.replaceChildren();

    checkRegisterButton();

    if (!subjectId) return;

    const subject = subjects.find(s => s.id === subjectId);

    if (!subject) return;

    // 科目情報表示
    const name = document.createElement("h3");
    name.textContent = subject.name;

    const credits = document.createElement("p");
    credits.textContent = "単位数：" + subject.credits;

    const terms = document.createElement("p");
    terms.textContent =
        "開講学期：" + subject.offeredTerm.join("・") + "学期";

    subjectInfo.append(name, credits, terms);


    // ★ 開講学期をプルダウンに設定
    subject.offeredTerm.forEach(term => {

        const option = document.createElement("option");

        option.value = term;
        option.textContent = term + "学期";

        semesterSelect.appendChild(option);

    });

    semesterSelect.disabled = false;

});


// 年度・学期変更時
if (yearSelect) {
    yearSelect.addEventListener("change", checkRegisterButton);
}

if (semesterSelect) {
    semesterSelect.addEventListener("change", checkRegisterButton);
}


// 起動
init();


// 履修登録ボタン
registerButton.addEventListener("click", async () => {

    console.log("ボタン押下");

    // 選択内容を取得
    const academicYear = Number(yearSelect.value);
    const subjectId = subjectSelect.value;
    const semester = Number(semesterSelect.value);

    // 入力チェック
    if (!academicYear || !subjectId || !semester) {
        alert("年度・科目・学期を選択してください。");
        return;
    }

    try {

        // Firestoreに保存するデータ
        const enrollmentData = {
            subjectId: subjectId,
            academicYear: academicYear,
            semester: semester,
            examResult: "未受験"
        };

        // Firestoreに登録
        const docRef = await addDoc(
            collection(
                db,
                "users",
                "testUser001",
                "enrollments"
            ),
            enrollmentData
        );

        console.log("登録ID:", docRef.id);

        alert("履修登録しました！");

        // 科目と学期の選択を初期化
        subjectSelect.value = "";

        resetSelect(semesterSelect);

        subjectInfo.replaceChildren();

        checkRegisterButton();

    } catch (error) {

        console.error("履修登録エラー:", error);

        alert("履修登録に失敗しました。\n" + error.message);

    }

});


// 履修状況表示ボタン
viewButton.addEventListener("click", async () => {

    const academicYear = Number(viewYearSelect.value);
    const semester = Number(viewSemesterSelect.value);

    // 入力チェック
    if (!viewYearSelect.value || !viewSemesterSelect.value) {
        alert("年度と学期を選択してください。");
        return;
    }

    // 表示領域を初期化
    enrollmentList.replaceChildren();

    enrollmentList.textContent = "読み込み中...";

    try {

        // Firestoreから履修データを取得
        const q = query(
            collection(
                db,
                "users",
                "testUser001",
                "enrollments"
            ),
            where("academicYear", "==", academicYear),
            where("semester", "==", semester)
        );

        const snapshot = await getDocs(q);

        enrollmentList.replaceChildren();

        // 該当データがない場合
        if (snapshot.empty) {

            enrollmentList.textContent =
                "該当する履修科目はありません。";

            return;
        }

        // 履修データを順番に表示
        snapshot.forEach(enrollmentDoc => {

            const enrollment = enrollmentDoc.data();

            // 科目マスターから科目情報を取得
            const subject = subjects.find(
                s => s.id === enrollment.subjectId
            );

            const div = document.createElement("div");
            div.className = "enrollment-item";

            const name = document.createElement("h3");

            name.textContent = subject
                ? subject.name
                : "科目情報が見つかりません";

            const category = document.createElement("p");

            category.textContent = subject
                ? subject.category1 + " / " + subject.category2
                : "";

            const credits = document.createElement("p");

            credits.textContent = subject
                ? "単位数：" + subject.credits
                : "";

            const result = document.createElement("p");

            result.textContent =
                "成績：" + enrollment.examResult;

            div.append(name, category, credits, result);

            enrollmentList.appendChild(div);

        });

    } catch (error) {

        console.error("履修データ取得エラー:", error);

        enrollmentList.textContent =
            "読み込みエラー：" + error.message;

    }

});




import { initializeApp }
from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";

import {
    getFirestore,
    collection,
    getDocs,
    addDoc,
    query,
    where,
    updateDoc,
    deleteDoc,
    doc
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

const graduationResults =
    document.getElementById("graduationResults");

// プルダウン初期化用関数
function resetSelect(select, disabled = true) {
    select.innerHTML =
        '<option value="">選択してください</option>';
    select.disabled = disabled;
}


// 初期処理
async function init() {

    console.log("init 3");
    
    try {

        const snapshot = await getDocs(
            collection(db, "subjects")
        );

        subjects = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        console.log("★取得した科目データ:", subjects);

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

    const academicYear = Number(yearSelect.value);
    const subjectId = subjectSelect.value;
    const semester = Number(semesterSelect.value);

    if (!academicYear || !subjectId || !semester) {
        alert("年度・科目・学期を選択してください。");
        return;
    }

    registerButton.disabled = true;

    try {

        const enrollmentsRef = collection(
            db,
            "users",
            "testUser001",
            "enrollments"
        );

        // 同じ科目がすでに登録されていないか確認
        const q = query(
            enrollmentsRef,
            where("subjectId", "==", subjectId)
        );

        const snapshot = await getDocs(q);

        if (!snapshot.empty) {

            const existing = snapshot.docs[0].data();

            alert(
                `この科目はすでに${existing.academicYear}年度の${existing.semester}学期に登録されています。\n\n4年間を通して同じ科目は登録できません。`
            );

            return;
        }

        // 重複がなければ登録
        await addDoc(enrollmentsRef, {
            subjectId: subjectId,
            academicYear: academicYear,
            semester: semester,
            examResult: "未受験"
        });

        alert("履修登録しました！");

        // 選択内容を初期化
        subjectSelect.value = "";

        resetSelect(semesterSelect);

        subjectInfo.replaceChildren();

        checkRegisterButton();

    } catch (error) {

        console.error("履修登録エラー:", error);

        alert("履修登録に失敗しました。\n" + error.message);

    } finally {

        checkRegisterButton();

    }

});

// 履修状況表示ボタン
viewButton.addEventListener("click", async () => {

    console.log("Viewボタン押下");
    
    const academicYear = Number(viewYearSelect.value);
    const semester = Number(viewSemesterSelect.value);

    if (!viewYearSelect.value || !viewSemesterSelect.value) {
        alert("年度と学期を選択してください。");
        return;
    }

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

        if (snapshot.empty) {
            enrollmentList.textContent =
                "該当する履修科目はありません。";
            return;
        }

        // 履修データを表示
        snapshot.forEach(enrollmentDoc => {

            const enrollment = enrollmentDoc.data();

            const subject = subjects.find(
                s => s.id === enrollment.subjectId
            );

            const div = document.createElement("div");
            div.className = "enrollment-item";

            // 科目名
            const name = document.createElement("h3");
            name.textContent = subject
                ? subject.name
                : "科目情報が見つかりません";

            // カテゴリ
            const category = document.createElement("p");
            category.textContent = subject
                ? subject.category1 + " / " + subject.category2
                : "";

            // 単位数
            const credits = document.createElement("p");
            credits.textContent = subject
                ? "単位数：" + subject.credits
                : "";

            // 成績選択欄
            const resultLabel = document.createElement("label");
            resultLabel.textContent = "成績：";

            const resultSelect = document.createElement("select");

            const results = ["未受験", "合格", "不合格"];

            results.forEach(result => {

                const option = document.createElement("option");
                option.value = result;
                option.textContent = result;

                resultSelect.appendChild(option);

            });

            resultSelect.value = enrollment.examResult || "未受験";

            // 成績変更時にFirestoreを更新
            resultSelect.addEventListener("change", async () => {

                const newResult = resultSelect.value;

                resultSelect.disabled = true;

                try {

                    await updateDoc(
                        doc(
                            db,
                            "users",
                            "testUser001",
                            "enrollments",
                            enrollmentDoc.id
                        ),
                        {
                            examResult: newResult
                        }
                    );

                    enrollment.examResult = newResult;

                    console.log("成績を更新しました:", newResult);

                } catch (error) {

                    console.error("成績更新エラー:", error);

                    alert("成績の更新に失敗しました。");

                    // 変更前の値に戻す
                    resultSelect.value =
                        enrollment.examResult || "未受験";

                } finally {

                    resultSelect.disabled = false;

                }

            });

            // 削除ボタン
            const deleteButton = document.createElement("button");
            deleteButton.textContent = "削除";
            deleteButton.className = "delete-button";

            deleteButton.addEventListener("click", async () => {

                if (!confirm("この履修科目を削除しますか？")) {
                    return;
                }

                deleteButton.disabled = true;

                try {

                    await deleteDoc(
                        doc(
                            db,
                            "users",
                            "testUser001",
                            "enrollments",
                            enrollmentDoc.id
                        )
                    );

                    // 画面からも削除
                    div.remove();

                    console.log("履修データを削除しました");

                    if (enrollmentList.children.length === 0) {
                        enrollmentList.textContent =
                            "該当する履修科目はありません。";
                    }

                } catch (error) {

                    console.error("削除エラー:", error);

                    alert("削除に失敗しました。");

                    deleteButton.disabled = false;

                }

            });

            // 画面に配置
            div.append(
                name,
                category,
                credits,
                resultLabel,
                resultSelect,
                deleteButton
            );

            enrollmentList.appendChild(div);

        });
        

    } catch (error) {

        console.error("履修データ取得エラー:", error);

        enrollmentList.textContent =
            "読み込みエラー：" + error.message;

    }
    
    await calculateGraduationRequirements();
    
});

// 卒業要件の単位数集計
async function calculateGraduationRequirements() {

    graduationResults.textContent = "集計中...";

    try {

        // 全履修データを取得
        const snapshot = await getDocs(
            collection(
                db,
                "users",
                "testUser001",
                "enrollments"
            )
        );

        const enrollments = snapshot.docs.map(d => d.data());

        // 合格した科目だけ抽出
        const passed = enrollments.filter(
            e => e.examResult === "合格"
        );

        // 科目IDごとに重複を除く
        const uniquePassed = [
            ...new Map(
                passed.map(e => [e.subjectId, e])
            ).values()
        ];

        // 科目情報を結合
        const passedSubjects = uniquePassed
            .map(e => {
                const subject = subjects.find(
                    s => s.id === e.subjectId
                );

                if (!subject) return null;

                return {
                    ...subject,
                    examResult: e.examResult
                };
            })
            .filter(s => s !== null);


        // 単位数を合計する関数
        function sumCredits(filterFunction) {

            return passedSubjects
                .filter(filterFunction)
                .reduce(
                    (total, s) => total + Number(s.credits || 0),
                    0
                );

        }


        // 卒業要件ごとの集計
        const results = [

            {
                name: "2. 教養・必修",
                credits: sumCredits(s =>
                    s.category1 === "教養" &&
                    s.required_type === "必修"
                ),
                required: 1
            },

            {
                name: "3. 教養・外国語",
                credits: sumCredits(s =>
                    s.category1 === "教養" &&
                    s.category2 === "外国語"
                ),
                required: 2
            },

            {
                name: "4. 教養・選択",
                credits: sumCredits(s =>
                    s.category1 === "教養" &&
                    s.required_type === "選択"
                ),
                required: 30
            },

            {
                name: "5. 専門・必修",
                credits: sumCredits(s =>
                    s.category1 === "専門" &&
                    s.required_type === "必修"
                ),
                required: 30
            },

            {
                name: "6. 情報社会・データサイエンス",
                credits: sumCredits(s =>
                    s.category1 === "専門" &&
                    ["情報社会", "データサイエンス"]
                        .includes(s.category2)
                ),
                required: 5
            },

            {
                name: "7. 情報システム",
                credits: sumCredits(s =>
                    s.category1 === "専門" &&
                    s.category2 === "情報システム"
                ),
                required: 5
            },

            {
                name: "8. マネジメント基礎",
                credits: sumCredits(s =>
                    s.category1 === "専門" &&
                    s.category2 === "マネジメント基礎"
                ),
                required: 5
            },

            {
                name: "9. 指定演習",
                credits: sumCredits(s =>
                    s.category1 === "専門" &&
                    s.category2 === "指定演習"
                ),
                required: 2
            },

            {
                name: "10. 専門・選択必修",
                credits: sumCredits(s =>
                    s.category1 === "専門" &&
                    s.required_type === "選択必修"
                ),
                required: 32
            },

            {
                name: "11. 総取得単位",
                credits: sumCredits(s =>
                    s.category1 === "教養" ||
                    s.category1 === "専門"
                ),
                required: 124
            }

        ];


        // 表示領域を初期化
        graduationResults.replaceChildren();


        // 卒業要件1：重複登録チェック
        const subjectIds = enrollments.map(e => e.subjectId);

        const hasDuplicate =
            new Set(subjectIds).size !== subjectIds.length;

        const duplicateDiv =
            document.createElement("div");

        duplicateDiv.className = "graduation-item";

        const duplicateTitle =
            document.createElement("h3");

        duplicateTitle.textContent =
            "1. 同一科目の重複登録チェック";

        const duplicateText =
            document.createElement("p");

        duplicateText.textContent = hasDuplicate
            ? "重複があります"
            : "重複はありません";

        duplicateDiv.append(
            duplicateTitle,
            duplicateText
        );

        graduationResults.appendChild(duplicateDiv);


        // 各要件の表示
        results.forEach(result => {

            const div = document.createElement("div");

            div.className = "graduation-item";

            const title = document.createElement("h3");
            title.textContent = result.name;

            const text = document.createElement("p");

            text.textContent =
                `${result.credits} / ${result.required} 単位`;

            div.append(title, text);

            graduationResults.appendChild(div);

        });

        console.log("卒業要件集計結果:", results);

    } catch (error) {

        console.error("卒業要件集計エラー:", error);

        graduationResults.textContent =
            "集計エラー：" + error.message;

    }

}


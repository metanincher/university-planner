
import { initializeApp }
from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";

// VSCodiumからの編集テスト
//
// デバッグモード
const DEBUG_MODE = false;

import {
    getFirestore,
    collection,
    getDocs,
    getDoc,
    addDoc,
    query,
    where,
    updateDoc,
    deleteDoc,
    doc
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";

import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";

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

const auth = getAuth(app);

// 息子のUID
const STUDENT_UID = "Z0TcNRMCLLetvD2yTiVDQMqgnSo2";

// 現在のログイン状態
let currentUser = null;

// 履修データの閲覧対象
let targetUserId = null;

// 閲覧専用モード
let isReadOnly = false;

// 履修データの閲覧対象を決定する
async function setupUserAccess(user) {

    // 息子本人がログインした場合
    if (user.uid === STUDENT_UID) {

        targetUserId = user.uid;
        isReadOnly = false;

        console.log("本人ログイン：編集可能");

        return;
    }

    // 母親がログインした場合
    const permissionRef = doc(
        db,
        "users",
        STUDENT_UID,
        "settings",
        "permissions"
    );

    const permissionSnap = await getDoc(permissionRef);

    if (!permissionSnap.exists()) {
        throw new Error("閲覧権限の設定が見つかりません。");
    }

    const permissions = permissionSnap.data();

    const parentUids = permissions.parentUids || [];

    // 母親のUIDが登録されているか確認
    if (!parentUids.includes(user.uid)) {
        throw new Error("この学生の履修データを閲覧する権限がありません。");
    }

    targetUserId = STUDENT_UID;
    isReadOnly = true;

    console.log("保護者ログイン：閲覧専用");
}

// 科目データを保存する配列
let subjects = [];

// HTML要素
const authPanel = document.getElementById("authPanel");
const appContent = document.getElementById("appContent");

const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

const loginButton = document.getElementById("loginButton");
//const signupButton = document.getElementById("signupButton");
const logoutButton = document.getElementById("logoutButton");

const authMessage = document.getElementById("authMessage");
const userEmail = document.getElementById("userEmail");


function enrollmentCollectionRef() {
    if (!targetUserId) {
        throw new Error("閲覧対象の学生が設定されていません。");
    }

    return collection(
        db,
        "users",
        targetUserId,
        "enrollments"
    );
}

// 現在のユーザー専用の履修データ参照先
function enrollmentDocRef(enrollmentId) {
    if (!targetUserId) {
        throw new Error("閲覧対象の学生が設定されていません。");
    }

    return doc(
        db,
        "users",
        targetUserId,
        "enrollments",
        enrollmentId
    );
}

function showAuthMessage(message) {
    authMessage.textContent = message;
}

function setAuthButtonsDisabled(disabled) {
    loginButton.disabled = disabled;
    //signupButton.disabled = disabled;
    logoutButton.disabled = disabled;
}


// ログイン
loginButton.addEventListener("click", async () => {

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
        showAuthMessage("メールアドレスとパスワードを入力してください。");
        return;
    }

    setAuthButtonsDisabled(true);
    showAuthMessage("ログイン中...");

    try {
        await signInWithEmailAndPassword(
            auth,
            email,
            password
        );

        showAuthMessage("");

    } catch (error) {

        console.error("ログインエラー:", error);

        const messages = {
            "auth/invalid-email": "メールアドレスの形式が正しくありません。",
            "auth/invalid-credential": "メールアドレスまたはパスワードが違います。",
            "auth/user-not-found": "アカウントが見つかりません。",
            "auth/wrong-password": "パスワードが違います。",
            "auth/too-many-requests": "ログイン試行回数が多すぎます。時間をおいてください。"
        };

        showAuthMessage(
            messages[error.code] ||
            "ログインに失敗しました。：" + error.message
        );

    } finally {
        setAuthButtonsDisabled(false);
    }
});


// ログアウト
logoutButton.addEventListener("click", async () => {

    if (!confirm("ログアウトしますか？")) {
        return;
    }

    logoutButton.disabled = true;

    try {

        await signOut(auth);

    } catch (error) {

        console.error("ログアウトエラー:", error);
        alert("ログアウトに失敗しました。");

    } finally {
        logoutButton.disabled = false;
    }
});


// ログイン状態の監視
onAuthStateChanged(auth, async (user) => {

    currentUser = user;

    if (user) {

        // ログイン済み
        authPanel.hidden = true;
        appContent.hidden = false;

        userEmail.textContent = user.email || "";

        document.getElementById("status").textContent =
            "ログインしました。科目データを読み込んでいます...";


        try {

            // ① ログインユーザーに応じて閲覧対象を決定
            await setupUserAccess(user);
        
            // ② 編集機能の制御
            checkRegisterButton();
        
            // ③ 科目データを読み込む
            await init();
        
        } catch (error) {

            console.error("初期化エラー:", error);

            document.getElementById("status").textContent =
                "初期化エラー：" + error.message;
        }

    } else {

        // ログアウト状態
        authPanel.hidden = false;
        appContent.hidden = true;

        userEmail.textContent = "";

        emailInput.value = "";
        passwordInput.value = "";

        showAuthMessage("");

        // 前のユーザーの画面情報を消去
        enrollmentList.replaceChildren();
        creditSummary.replaceChildren();
        graduationResults.replaceChildren();

        targetUserId = null;
        isReadOnly = false;

        fourYearPlan.replaceChildren();

        subjects = [];
    }
});

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

const fourYearPlan =
    document.getElementById("fourYearPlan");

const creditSummary =
    document.getElementById("creditSummary");

// プルダウン初期化用関数
function resetSelect(select, disabled = true) {
    select.innerHTML =
        '<option value="">選択してください</option>';
    select.disabled = disabled;
}


// 初期処理
async function init() {

    console.log("init 10");
    
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

        if (DEBUG_MODE) {
            document.getElementById("status").textContent =
                "科目データを読み込みました！";
        }

    } catch (error) {

        document.getElementById("status").textContent =
            "エラー: " + error.message;

        console.error(error);

    }

}


// 登録ボタンの有効・無効を判定
function checkRegisterButton() {

    if (!registerButton) return;

    // 保護者は常に登録不可
    if (isReadOnly) {
        registerButton.disabled = true;
        return;
    }

    // 本人の場合は入力状況で判定
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
        option.textContent =
        `${subject.name}（${subject.required_type}）`;

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
//init();


// 履修登録ボタン
registerButton.addEventListener("click", async () => {

    // 保護者の場合は登録処理を実行しない
    if (isReadOnly) {
        alert("保護者アカウントでは履修登録できません。");
        return;
    }
    
    const academicYear = Number(yearSelect.value);
    const subjectId = subjectSelect.value;
    const semester = Number(semesterSelect.value);

    if (!academicYear || !subjectId || !semester) {
        alert("年度・科目・学期を選択してください。");
        return;
    }

    registerButton.disabled = true;

    try {

        const enrollmentsRef = enrollmentCollectionRef();

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
            enrollmentCollectionRef(),
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
            
                // 科目区分（必修・選択必修・選択）
            const requiredType = document.createElement("p");
            requiredType.textContent = subject
                ? "科目区分：" + subject.required_type
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
            // 保護者の場合は変更不可
            resultSelect.disabled = isReadOnly;

            // 成績変更時にFirestoreを更新
            resultSelect.addEventListener("change", async () => {

                const newResult = resultSelect.value;

                resultSelect.disabled = true;

                try {

                    await updateDoc(
                        enrollmentDocRef(enrollmentDoc.id),
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
                    //// 保護者の場合は変更不可
                    //resultSelect.disabled = isReadOnly;　//→確認要

                } finally {

                    //resultSelect.disabled = false;
                    // 保護者は常に変更不可
                    resultSelect.disabled = isReadOnly;

                }

            });

            // 削除ボタン
            const deleteButton = document.createElement("button");
            deleteButton.textContent = "削除";
            deleteButton.className = "delete-button";
            // 保護者には削除ボタンを表示しない
            deleteButton.hidden = isReadOnly;

            deleteButton.addEventListener("click", async () => {

                if (!confirm("この履修科目を削除しますか？")) {
                    return;
                }

                deleteButton.disabled = true;

                try {

                    await deleteDoc(
                        enrollmentDocRef(enrollmentDoc.id)
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
                requiredType,
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

    await calculateCreditSummary();
    await calculateGraduationRequirements();
    await displayFourYearPlan();
    
});


// 卒業要件の単位数集計・達成状況表示
async function calculateGraduationRequirements() {

    graduationResults.textContent = "集計中...";

    try {

        // 全履修データを取得
        const snapshot = await getDocs(
            enrollmentCollectionRef()
        );

        const enrollments = snapshot.docs.map(d => d.data());

        // 科目情報を結合
        const enrollmentSubjects = enrollments
            .map(e => {

                const subject = subjects.find(
                    s => s.id === e.subjectId
                );

                if (!subject) return null;

                return {
                    ...subject,
                    examResult: e.examResult || "未受験"
                };

            })
            .filter(s => s !== null);

        // 科目IDごとに重複を除く
        const uniqueSubjects = [
            ...new Map(
                enrollmentSubjects.map(
                    s => [s.id, s]
                )
            ).values()
        ];

        // 重複登録チェック
        const subjectIds = enrollments.map(e => e.subjectId);

        const hasDuplicate =
            new Set(subjectIds).size !== subjectIds.length;

        // 単位数集計関数
        function sumCredits(filterFunction, resultType) {

            return uniqueSubjects
                .filter(s =>
                    filterFunction(s) &&
                    (
                        resultType === "all" ||
                        s.examResult === resultType
                    )
                )
                .reduce(
                    (total, s) =>
                        total + Number(s.credits || 0),
                    0
                );

        }

        // 卒業要件
        const requirements = [

            {
                name: "2. 教養・必修",
                filter: s =>
                    s.category1 === "教養" &&
                    s.required_type === "必修",
                required: 1
            },

            {
                name: "3. 教養・外国語",
                filter: s =>
                    s.category1 === "教養" &&
                    s.category2 === "外国語",
                required: 2
            },

            {
                name: "4. 教養・選択",
                filter: s =>
                    s.category1 === "教養" &&
                    s.required_type === "選択",
                required: 30
            },

            {
                name: "5. 専門・必修",
                filter: s =>
                    s.category1 === "専門" &&
                    s.required_type === "必修",
                required: 30
            },

            {
                name: "6. 情報社会・データサイエンス",
                filter: s =>
                    s.category1 === "専門" &&
                    ["情報社会", "データサイエンス"]
                        .includes(s.category2),
                required: 5
            },

            {
                name: "7. 情報システム",
                filter: s =>
                    s.category1 === "専門" &&
                    s.category2 === "情報システム",
                required: 5
            },

            {
                name: "8. マネジメント基礎",
                filter: s =>
                    s.category1 === "専門" &&
                    s.category2 === "マネジメント基礎",
                required: 5
            },

            {
                name: "9. 指定演習",
                filter: s =>
                    s.category1 === "専門" &&
                    s.category2 === "指定演習",
                required: 2
            },

            {
                name: "10. 専門・選択必修",
                filter: s =>
                    s.category1 === "専門" &&
                    s.required_type === "選択必修",
                required: 32
            },

            {
                name: "11. 総取得単位",
                filter: s =>
                    s.category1 === "教養" ||
                    s.category1 === "専門",
                required: 124
            }

        ];

        // 各要件の取得済み・履修予定単位を計算
        const results = requirements.map(requirement => {

            const passed = sumCredits(
                requirement.filter,
                "合格"
            );

            const planned = sumCredits(
                requirement.filter,
                "未受験"
            );

            return {
                ...requirement,
                passed,
                planned,
                total: passed + planned,
                remaining: Math.max(
                    0,
                    requirement.required - passed - planned
                )
            };

        });

        // 全体の達成状況
        // 実際の達成：合格単位のみ
        // 計画上の達成：合格＋未受験
        const actualCompleted = results.filter(
            r => r.passed >= r.required
        ).length;

        const plannedCompleted = results.filter(
            r => r.total >= r.required
        ).length;

        const totalCount = results.length;

        // 表示領域初期化
        graduationResults.replaceChildren();

        // 全体サマリー
        const summary = document.createElement("div");
        summary.className = "graduation-summary";

        const title = document.createElement("h3");
        title.textContent = "卒業要件の達成状況";

        const actualText = document.createElement("p");
        actualText.textContent =
            `取得済みで達成：${actualCompleted} / ${totalCount} 項目`;

        const plannedText = document.createElement("p");
        plannedText.textContent =
            `履修予定を含めた達成：${plannedCompleted} / ${totalCount} 項目`;

        const summaryNumber = document.createElement("div");
        summaryNumber.className = "summary-number";
        summaryNumber.textContent =
            `${plannedCompleted} / ${totalCount}`;

        const summaryLabel = document.createElement("p");
        summaryLabel.textContent = "計画上の達成項目数";

        const progressBar = document.createElement("div");
        progressBar.className = "graduation-progress";

        const progressInner = document.createElement("div");
        progressInner.className = "graduation-progress-bar";

        progressInner.style.width =
            (plannedCompleted / totalCount * 100) + "%";

        progressBar.appendChild(progressInner);

        summary.append(
            title,
            actualText,
            plannedText,
            summaryNumber,
            summaryLabel,
            progressBar
        );

        graduationResults.appendChild(summary);

        // 重複登録チェック
        const duplicateDiv = document.createElement("div");
        duplicateDiv.className = "graduation-item";

        const duplicateTitle = document.createElement("h3");
        duplicateTitle.textContent = "1. 同一科目の重複登録";

        const duplicateText = document.createElement("p");
        duplicateText.textContent = hasDuplicate
            ? "同じ科目が重複登録されています。"
            : "重複登録はありません。";

        const duplicateStatus = document.createElement("span");

        duplicateStatus.className =
            "graduation-status " +
            (hasDuplicate ? "incomplete" : "complete");

        duplicateStatus.textContent =
            hasDuplicate ? "要確認" : "問題なし";

        duplicateDiv.append(
            duplicateTitle,
            duplicateText,
            duplicateStatus
        );

        graduationResults.appendChild(duplicateDiv);

        // 各卒業要件を表示
        results.forEach(result => {

            const div = document.createElement("div");
            div.className = "graduation-item";

            const title = document.createElement("h3");
            title.textContent = result.name;

            const passedText = document.createElement("p");
            passedText.textContent =
                `取得済み：${result.passed} / ${result.required} 単位`;

            const plannedText = document.createElement("p");
            plannedText.textContent =
                `履修予定：${result.planned} 単位`;

            const totalText = document.createElement("p");
            totalText.textContent =
                `計画上の合計：${result.total} / ${result.required} 単位`;

            // 実際の達成状況
            const actualStatus = document.createElement("span");

            const actualComplete =
                result.passed >= result.required;

            actualStatus.className =
                "graduation-status " +
                (actualComplete ? "complete" : "incomplete");

            actualStatus.textContent =
                actualComplete
                    ? "取得済みで達成"
                    : `取得済みではあと${Math.max(
                        0,
                        result.required - result.passed
                    )}単位`;

            // 計画上の達成状況
            const plannedStatus = document.createElement("span");

            const plannedComplete =
                result.total >= result.required;

            plannedStatus.className =
                "graduation-status " +
                (plannedComplete ? "complete" : "incomplete");

            plannedStatus.style.marginLeft = "8px";

            plannedStatus.textContent =
                plannedComplete
                    ? "計画上は達成"
                    : `計画上あと${result.remaining}単位`;

            div.append(
                title,
                passedText,
                plannedText,
                totalText,
                actualStatus,
                plannedStatus
            );

            graduationResults.appendChild(div);

        });

        // 最終判定
        const finalDiv = document.createElement("div");
        finalDiv.className = "graduation-summary";

        const finalTitle = document.createElement("h3");
        finalTitle.textContent = "卒業見込み判定";

        const allPlannedComplete =
            results.every(r => r.total >= r.required);

        const allActualComplete =
            results.every(r => r.passed >= r.required);

        const finalText = document.createElement("p");

        if (hasDuplicate) {

            finalText.textContent =
                "同一科目の重複登録があります。履修計画を確認してください。";

        } else if (allActualComplete) {

            finalText.textContent =
                "すべての単位要件を取得済みです！";

        } else if (allPlannedComplete) {

            finalText.textContent =
                "現在の履修計画では、すべての単位要件を満たす見込みです。未受験科目の合格が必要です。";

        } else {

            finalText.textContent =
                "現在の履修計画では、一部の卒業要件が不足しています。";

        }

        finalDiv.append(finalTitle, finalText);
        graduationResults.appendChild(finalDiv);

        console.log("卒業要件集計結果:", results);

    } catch (error) {

        console.error("卒業要件集計エラー:", error);

        graduationResults.textContent =
            "集計エラー：" + error.message;

    }

}


// 4年間の履修計画を表示
async function displayFourYearPlan() {

    fourYearPlan.textContent = "読み込み中...";

    try {

        // 全履修データを取得
        const snapshot = await getDocs(
            enrollmentCollectionRef()
        );

        const enrollments = snapshot.docs.map(d => d.data());

        fourYearPlan.replaceChildren();

        let grandTotal = 0;

        // 2026～2029年度
        for (let year = 2026; year <= 2029; year++) {

            const yearDiv = document.createElement("div");
            yearDiv.className = "year-plan";

            const yearTitle = document.createElement("h3");
            yearTitle.textContent = year + "年度";

            const yearTotal = document.createElement("p");
            yearTotal.className = "year-plan-total";

            let yearCredits = 0;

            // 1～4学期
            for (let semester = 1; semester <= 4; semester++) {

                const semesterDiv =
                    document.createElement("div");

                semesterDiv.className = "semester-plan";

                const semesterTitle =
                    document.createElement("h4");

                semesterTitle.textContent =
                    semester + "学期";

                // 該当する履修データを取得
                const filtered = enrollments.filter(e =>
                    Number(e.academicYear) === year &&
                    Number(e.semester) === semester
                );

                const subjectContainer =
                    document.createElement("div");

                let semesterCredits = 0;

                if (filtered.length === 0) {

                    const empty =
                        document.createElement("p");

                    empty.className = "semester-empty";

                    empty.textContent = "履修科目はありません";

                    subjectContainer.appendChild(empty);

                } else {

                    filtered.forEach(enrollment => {

                        const subject = subjects.find(s =>
                            s.id === enrollment.subjectId
                        );

                        if (!subject) return;

                        const item =
                            document.createElement("div");

                        item.className = "semester-subject";

                        item.textContent =
                            `${subject.name}（${subject.required_type}・${subject.credits}単位）`;

                        subjectContainer.appendChild(item);

                        const credits =
                            Number(subject.credits || 0);

                        semesterCredits += credits;

                    });

                }

                yearCredits += semesterCredits;

                const semesterTotal =
                    document.createElement("p");

                semesterTotal.className = "year-plan-total";

                semesterTotal.textContent =
                    "履修予定：" + semesterCredits + "単位";

                semesterDiv.append(
                    semesterTitle,
                    subjectContainer,
                    semesterTotal
                );

                yearDiv.appendChild(semesterDiv);

            }

            yearTotal.textContent =
                "年間合計：" + yearCredits + "単位";

            grandTotal += yearCredits;

            yearDiv.insertBefore(yearTitle, yearDiv.firstChild);

            yearDiv.appendChild(yearTotal);

            fourYearPlan.appendChild(yearDiv);

        }

        // 4年間の合計
        const totalDiv = document.createElement("div");

        totalDiv.className = "four-year-total";

        const totalTitle = document.createElement("p");

        totalTitle.textContent = "4年間の履修予定合計";

        const totalValue = document.createElement("strong");

        totalValue.textContent = grandTotal + "単位";

        totalDiv.append(totalTitle, totalValue);

        fourYearPlan.appendChild(totalDiv);

        console.log("4年間の履修計画を表示しました。");

    } catch (error) {

        console.error("4年間の履修計画エラー:", error);

        fourYearPlan.textContent =
            "読み込みエラー：" + error.message;

    }

}


// 取得済み単位・履修予定単位の集計
async function calculateCreditSummary() {

    creditSummary.textContent = "集計中...";

    try {

        // 全履修データを取得
        const snapshot = await getDocs(
            enrollmentCollectionRef()
        );

        const enrollments = snapshot.docs.map(d => d.data());

        // 科目情報を結合
        const enrollmentSubjects = enrollments
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


        // 同一科目の重複を除く
        const uniqueSubjects = [
            ...new Map(
                enrollmentSubjects.map(
                    s => [s.id, s]
                )
            ).values()
        ];


        // 取得済み単位
        const passedCredits = uniqueSubjects
            .filter(s => s.examResult === "合格")
            .reduce(
                (total, s) =>
                    total + Number(s.credits || 0),
                0
            );


        // 履修予定単位（未受験）
        const plannedCredits = uniqueSubjects
            .filter(s => s.examResult === "未受験")
            .reduce(
                (total, s) =>
                    total + Number(s.credits || 0),
                0
            );


        // 合計
        const totalCredits =
            passedCredits + plannedCredits;

        // 卒業必要単位
        const requiredCredits = 124;

        // 不足単位
        const remainingCredits = Math.max(
            0,
            requiredCredits - totalCredits
        );

        // 進捗率
        const progress = Math.min(
            100,
            totalCredits / requiredCredits * 100
        );


        // 表示領域初期化
        creditSummary.replaceChildren();

        const container =
            document.createElement("div");

        container.className = "credit-summary";


        // タイトル
        const title = document.createElement("h3");

        title.textContent = "卒業までの単位取得状況";


        // 数値表示用カード
        const grid = document.createElement("div");

        grid.className = "credit-summary-grid";


        function createCard(label, value, color) {

            const card = document.createElement("div");

            card.className = "credit-summary-card";

            const cardLabel =
                document.createElement("div");

            cardLabel.className = "credit-summary-label";

            cardLabel.textContent = label;

            const cardValue =
                document.createElement("div");

            cardValue.className = "credit-summary-value";

            cardValue.style.color = color;

            cardValue.textContent = value;

            const unit = document.createElement("div");

            unit.className = "credit-summary-unit";

            unit.textContent = "単位";

            card.append(
                cardLabel,
                cardValue,
                unit
            );

            return card;

        }


        grid.append(
            createCard(
                "取得済み単位",
                passedCredits,
                "#16a34a"
            ),
            createCard(
                "履修予定単位",
                plannedCredits,
                "#2563eb"
            ),
            createCard(
                "卒業必要単位",
                requiredCredits,
                "#334155"
            ),
            createCard(
                "計画上の不足",
                remainingCredits,
                remainingCredits === 0
                    ? "#16a34a"
                    : "#dc2626"
            )
        );


        // 進捗タイトル
        const progressTitle =
            document.createElement("h4");

        progressTitle.textContent =
            "卒業必要単位に対する計画";


        const progressText =
            document.createElement("p");

        progressText.textContent =
            `${totalCredits} / ${requiredCredits} 単位`;


        // プログレスバー
        const progressBar =
            document.createElement("div");

        progressBar.className = "credit-progress";


        const passedBar =
            document.createElement("div");

        passedBar.className = "credit-progress-passed";

        passedBar.style.width =
            Math.min(100, passedCredits / requiredCredits * 100) + "%";


        const plannedBar =
            document.createElement("div");

        plannedBar.className = "credit-progress-planned";

        plannedBar.style.width =
            Math.min(
                100 - passedCredits / requiredCredits * 100,
                plannedCredits / requiredCredits * 100
            ) + "%";


        const remainingBar =
            document.createElement("div");

        remainingBar.className =
            "credit-progress-remaining";

        remainingBar.style.flex = "1";


        progressBar.append(
            passedBar,
            plannedBar,
            remainingBar
        );


        // 凡例
        const legend =
            document.createElement("div");

        legend.className = "credit-legend";


        function createLegend(color, label) {

            const item =
                document.createElement("div");

            item.className = "credit-legend-item";

            const square =
                document.createElement("span");

            square.className = "credit-legend-color";

            square.style.background = color;

            const text =
                document.createElement("span");

            text.textContent = label;

            item.append(square, text);

            return item;

        }


        legend.append(
            createLegend("#16a34a", "取得済み"),
            createLegend("#3b82f6", "履修予定"),
            createLegend("#e2e8f0", "不足")
        );


        // 計画達成状況
        const status =
            document.createElement("p");

        status.style.fontWeight = "bold";

        status.textContent =
            remainingCredits === 0
                ? "計画上は卒業必要単位を満たしています！"
                : `計画上、あと${remainingCredits}単位必要です。`;


        container.append(
            title,
            grid,
            progressTitle,
            progressText,
            progressBar,
            legend,
            status
        );

        creditSummary.appendChild(container);


        console.log("単位数集計:", {
            passedCredits,
            plannedCredits,
            totalCredits,
            remainingCredits
        });

    } catch (error) {

        console.error("単位数集計エラー:", error);

        creditSummary.textContent =
            "集計エラー：" + error.message;

    }

}

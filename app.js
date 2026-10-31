
import { initializeApp }
from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";

import {
    getFirestore,
    collection,
    getDocs
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
const subjectInfo = document.getElementById("subjectInfo");


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

    }

}


// 大カテゴリ変更時
category1Select.addEventListener("change", () => {

    const category1 = category1Select.value;

    // 中カテゴリと科目を初期化
    category2Select.innerHTML =
        '<option value="">選択してください</option>';

    subjectSelect.innerHTML =
        '<option value="">選択してください</option>';

    category2Select.disabled = true;
    subjectSelect.disabled = true;

    subjectInfo.replaceChildren();

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

    subjectSelect.innerHTML =
        '<option value="">選択してください</option>';

    subjectSelect.disabled = true;
    subjectInfo.replaceChildren();

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

    subjectInfo.replaceChildren();

    if (!subjectId) return;

    const subject = subjects.find(s => s.id === subjectId);

    const name = document.createElement("h3");
    name.textContent = subject.name;

    const credits = document.createElement("p");
    credits.textContent = "単位数：" + subject.credits;

    const terms = document.createElement("p");
    terms.textContent =
        "開講学期：" + subject.offeredTerm.join("・") + "学期";

    subjectInfo.append(name, credits, terms);

});


// 起動
init();

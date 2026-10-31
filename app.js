
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

// Firestore接続
const db = getFirestore(app);


// 科目一覧を取得
async function loadSubjects() {

    const status = document.getElementById("status");
    const subjectList = document.getElementById("subjectList");

    try {

        const snapshot = await getDocs(
            collection(db, "subjects")
        );

        subjectList.replaceChildren();

        if (snapshot.empty) {
            subjectList.textContent =
                "まだ科目が登録されていません。";
        }

        snapshot.forEach((subjectDoc) => {

            const data = subjectDoc.data();

            const div = document.createElement("div");
            div.className = "subject";

            const name = document.createElement("h3");
            name.textContent = data.name;

            const category = document.createElement("p");
            category.textContent =
                data.category1 + " / " + data.category2;

            const credits = document.createElement("p");
            credits.textContent = data.credits + "単位";

            div.append(name, category, credits);

            subjectList.appendChild(div);

        });

        status.textContent = "Firebase接続成功！";

    } catch (error) {

        status.textContent =
            "エラー: " + error.message;

        console.error(error);

    }

}

loadSubjects();

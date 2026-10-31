
import { initializeApp }
from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";

import {
    getFirestore,
    collection,
    getDocs
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";


// Firebase設定
const firebaseConfig = {
    apiKey: "ここに自分のAPIキー",
    authDomain: "ここに自分のAuthDomain",
    projectId: "ここに自分のProjectID",
    storageBucket: "ここに自分のStorageBucket",
    messagingSenderId: "ここに自分のMessagingSenderId",
    appId: "ここに自分のAppId"
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

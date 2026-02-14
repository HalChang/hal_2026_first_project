"use client"; // 必須加上這一行，因為我們要使用 useState 和 useEffect

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase"; // @ 代表 src 目錄

// 定義資料的型別，這樣 TS 就不會報錯
interface MessageItem {
	id: number;
	content: string;
	created_at: string;
}

export default function Home() {
	const [message, setMessage] = useState("");
	// 修正紅底：指定型別為 MessageItem 的陣列
	const [list, setList] = useState<MessageItem[]>([]);
	const [isLoading, setIsLoading] = useState(false); // 功能1：載入狀態

	// 1. 從資料庫讀取資料
	async function fetchMessages() {
		const { data, error } = await supabase
			.from("halChang")
			.select("*")
			.order("created_at", { ascending: false }); // 讓最新的留言在上面

		if (error) {
			console.error("讀取失敗:", error.message);
		} else {
			setList(data || []);
		}
	}

	// 刪除留言
	async function deleteMessage(id: number) {
		// 增加一個簡單的確認窗，防止誤刪
		if (!confirm("確定要刪除這則留言嗎？")) return;

		const { error } = await supabase.from("halChang").delete().eq("id", id);

		if (error) {
			console.error("刪除失敗:", error.message);
			alert("刪除失敗");
		}
		// 注意：這裡不必寫 fetchMessages()，Realtime 監聽會幫你做
	}

	// 2. 將新資料寫入資料庫
	async function sendMessage() {
		if (!message.trim()) return; // 防止空白留言
		setIsLoading(true); // 開始載入

		const { error } = await supabase
			.from("halChang")
			.insert([{ content: message }]);

		if (error) {
			alert("寫入失敗，請檢查 Supabase 的 RLS 權限設定！");
			console.error(error); // 建議加這一行，可以在 Console 看到更細節的錯誤
		} else {
			setMessage(""); // 清空輸入框
			// 移除 fetchMessages()，交給 useEffect 裡的 Realtime 處理
		}
		setIsLoading(false); // 結束載入
	}

	// 功能3：即時通訊 (Realtime)
	useEffect(() => {
		fetchMessages();

		// 訂閱資料庫變動
		const channel = supabase
			.channel("schema-db-changes") // 頻道名稱隨意
			.on(
				"postgres_changes",
				{ event: "*", schema: "public", table: "halChang" },
				(payload) => {
					console.log("資料庫有變動!", payload);
					fetchMessages(); // 只要資料庫有增刪改，就重新抓取
				},
			)
			.subscribe();

		return () => {
			supabase.removeChannel(channel); // 組件卸載時取消訂閱
		};
	}, []);

	// ... 下方的 sendMessage 函數保持不變 ...

	return (
		<main className="min-h-screen bg-gray-100 p-8 text-black">
			<div className="max-w-md mx-auto bg-white rounded-xl shadow-md p-6">
				<h1 className="text-2xl font-bold text-gray-800 mb-6">
					React 即時留言板
				</h1>

				<div className="flex gap-2 mb-6">
					<input
						type="text"
						className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
						placeholder={isLoading ? "傳送中..." : "你想說什麼？"}
						disabled={isLoading}
						value={message}
						onChange={(e) => setMessage(e.target.value)}
					/>
					<button
						onClick={sendMessage}
						disabled={isLoading}
						className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition"
					>
						{isLoading ? "..." : "送出"}
					</button>
				</div>

				<div className="space-y-3">
					{list.map((item) => (
						<div
							key={item.id}
							className="flex justify-between items-center p-3 bg-blue-50 border-l-4 border-blue-500 rounded text-gray-700 group"
						>
							<span>{item.content}</span>
							<button
								onClick={() => deleteMessage(item.id)}
								className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition"
							>
								刪除
							</button>
						</div>
					))}
				</div>
			</div>
		</main>
	);
}

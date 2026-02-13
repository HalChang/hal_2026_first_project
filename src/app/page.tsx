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

	// 2. 將新資料寫入資料庫
	async function sendMessage() {
		if (!message.trim()) return; // 防止空白留言

		const { error } = await supabase
			.from("halChang")
			.insert([{ content: message }]);

		if (error) {
			alert("寫入失敗，請檢查 Supabase 的 RLS 權限設定！");
			console.error(error); // 建議加這一行，可以在 Console 看到更細節的錯誤
		} else {
			setMessage(""); // 清空輸入框
			fetchMessages(); // 重新刷新列表
		}
	}

	useEffect(() => {
		fetchMessages();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []); // 這裡加一行註解可以跳過 Next.js 的嚴格檢查警告

	// ... 下方的 sendMessage 函數保持不變 ...

	return (
		<main className="min-h-screen bg-gray-100 p-8 text-black">
			<div className="max-w-md mx-auto bg-white rounded-xl shadow-md p-6">
				<h1 className="text-2xl font-bold text-gray-800 mb-6">
					React x Supabase 留言板
				</h1>

				{/* 輸入區域 */}
				<div className="flex gap-2 mb-6">
					<input
						type="text"
						className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
						placeholder="你想說什麼？"
						value={message}
						onChange={(e) => setMessage(e.target.value)}
					/>
					<button
						onClick={sendMessage}
						className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition duration-200"
					>
						送出
					</button>
				</div>

				{/* 顯示區域 */}
				<div className="space-y-3">
					{list.length === 0 ? (
						<p className="text-center text-gray-400 py-4">目前還沒有留言喔！</p>
					) : (
						list.map((item) => (
							<div
								key={item.id}
								className="p-3 bg-blue-50 border-l-4 border-blue-500 rounded text-gray-700"
							>
								{item.content}
							</div>
						))
					)}
				</div>
			</div>
		</main>
	);
}

"use client"; // 必須加上這一行，因為我們要使用 useState 和 useEffect

import { useState, useEffect, useRef } from "react";
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
	const inputRef = useRef<HTMLInputElement>(null); // 建立引用

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

	// 將新資料寫入資料庫
	async function sendMessage() {
		if (!message.trim()) return; // 防止空白留言
		setIsLoading(true); // 開始載入

		const { error } = await supabase
			.from("halChang")
			.insert([{ content: message }]);

		if (!error) {
			setMessage("");
			// 送出後自動對焦回輸入框
			inputRef.current?.focus();
		}
		setIsLoading(false); // 結束載入
	}

	// 處理 Enter 鍵送出
	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" && !e.nativeEvent.isComposing) {
			sendMessage();
		}
	};

	async function addLike(id: number, currentLikes: number) {
		const { error } = await supabase
			.from("halChang")
			.update({ likes: currentLikes + 1 })
			.eq("id", id);

		if (error) console.error("點讚失敗", error);
	}

	// 即時通訊 (Realtime)
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
					/* 做法 A：簡單暴力，直接重新抓取資料
					fetchMessages();
					*/

					// 做法 B (進階)：手動更新 state，完全不用 fetch (效能最好)
					if (payload.eventType === "INSERT") {
						setList((prev) => [payload.new as MessageItem, ...prev]);
					} else if (payload.eventType === "DELETE") {
						setList((prev) =>
							prev.filter((item) => item.id !== payload.old.id),
						);
					}
				},
			)
			.subscribe((status) => {
				console.log("訂閱狀態:", status); // 可以在 F12 Console 檢查是否為 'SUBSCRIBED'
			});

		return () => {
			supabase.removeChannel(channel); // 組件卸載時取消訂閱
		};
	}, []);

	return (
		<main className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-8 text-black">
			<div className="max-w-md mx-auto bg-white/90 backdrop-blur-sm rounded-2xl shadow-2xl p-8 transition-all hover:shadow-indigo-500/20">
				<h1 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 mb-8 text-center">
					即時互動留言板
				</h1>

				{/* ... 輸入框區塊 ... */}

				<div className="space-y-4">
					{list.map((item: any) => (
						<div
							key={item.id}
							className="group relative bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:border-blue-300 transition-all"
						>
							<p className="text-gray-800 pr-10">{item.content}</p>

							<div className="mt-3 flex items-center gap-4">
								{/* 點讚按鈕 */}
								<button
									onClick={() => addLike(item.id, item.likes || 0)}
									className="text-sm flex items-center gap-1 text-gray-500 hover:text-pink-500 transition"
								>
									❤️ {item.likes || 0}
								</button>

								<span className="text-xs text-gray-400">
									{new Date(item.created_at).toLocaleTimeString()}
								</span>
							</div>

							<button
								onClick={() => deleteMessage(item.id)}
								className="absolute top-4 right-4 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"
							>
								🗑️
							</button>
						</div>
					))}
				</div>
			</div>
		</main>
	);
}

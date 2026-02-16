"use client"; // 必須加上這一行，因為我們要使用 useState 和 useEffect

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase"; // @ 代表 src 目錄
import { User } from "@supabase/supabase-js"; // 引入 User 型別

// 定義資料的型別，這樣 TS 就不會報錯
interface MessageItem {
	id: number;
	content: string;
	created_at: string;
}

export default function Home() {
	const [message, setMessage] = useState("");
	const [list, setList] = useState<MessageItem[]>([]);
	const [isLoading, setIsLoading] = useState(false); // 載入狀態
	const inputRef = useRef<HTMLInputElement>(null); // 建立引用
	const [user, setUser] = useState<User | null>(null); // 儲存登入者資訊
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");

	// 從資料庫讀取資料
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
	}

	// 將新資料寫入資料庫
	async function sendMessage() {
		if (!message.trim() || !user) {
			alert("請先登入後再留言！");
			return;
		}

		setIsLoading(true); // 開始載入

		const { error } = await supabase.from("halChang").insert([
			{
				content: message,
				user_id: user.id, // 將當前登入使用者的 uuid 存入 user_id 欄位
			},
		]);

		if (error) {
			console.error("發送失敗:", error.message);
			alert("發送失敗，請檢查權限設定");
		} else {
			setMessage("");
		}
		setIsLoading(false);
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

	// 登入功能
	// 註冊新帳號
	async function handleSignUp() {
		const { data, error } = await supabase.auth.signUp({
			email,
			password,
		});
		if (error) alert("註冊失敗: " + error.message);
		else alert("請去信箱收取驗證信！");
	}

	// 帳密登入
	async function handleSignIn() {
		const { data, error } = await supabase.auth.signInWithPassword({
			email,
			password,
		});
		if (error) alert("登入失敗: " + error.message);
	}

	// 登出功能
	async function logout() {
		await supabase.auth.signOut();
	}

	// 即時通訊 (Realtime)
	useEffect(() => {
		// 初始化時檢查目前的登入狀態
		supabase.auth.getUser().then(({ data: { user } }) => {
			setUser(user);
		});

		// 監聽登入狀態變動 (登入或登出時會觸發)
		// 當 Supabase 偵測到網址有 Token 時，會自動觸發這個監聽器
		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange((event, session) => {
			console.log("Auth Event:", event); // 可以在 Console 看是否有 'SIGNED_IN'
			if (session) {
				setUser(session.user);
				// 成功登入後，手動把網址後面那串亂碼清掉
				window.history.replaceState(
					{},
					document.title,
					window.location.pathname,
				);
			}
		});

		fetchMessages();

		// 訂閱資料庫變動
		const channel = supabase
			.channel("schema-db-changes") // 頻道名稱隨意
			.on(
				"postgres_changes",
				{ event: "*", schema: "public", table: "halChang" },
				(payload) => {
					console.log("資料庫有變動!", payload);
					// 做法 A：簡單暴力，直接重新抓取資料
					fetchMessages();

					/* // 做法 B (進階)：手動更新 state，完全不用 fetch (效能最好)
					if (payload.eventType === "INSERT") {
						setList((prev) => [payload.new as MessageItem, ...prev]);
					} else if (payload.eventType === "DELETE") {
						setList((prev) =>
							prev.filter((item) => item.id !== payload.old.id),
						);
					} */
				},
			)
			.subscribe((status) => {
				console.log("訂閱狀態:", status); // 可以在 F12 Console 檢查是否為 'SUBSCRIBED'
			});

		return () => {
			// 這裡原本寫錯了，應該是取消訂閱 auth 監聽
			subscription.unsubscribe();
			// 如果有 channel 也要取消
			supabase.removeChannel(channel);
		};
	}, []);

	return (
		<main className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-8 text-black">
			{/* 1. 頂部狀態列：顯示頭像或登入按鈕 */}
			<div className="flex justify-between items-center mb-8 bg-white/50 p-4 rounded-lg">
				{user ? (
					<div className="flex items-center gap-3">
						<span className="font-bold">歡迎, {user.email}</span>
						<button onClick={logout} className="text-xs text-red-500 underline">
							登出
						</button>
					</div>
				) : (
					<div className="flex flex-col gap-2 w-full max-w-xs mx-auto mb-8 bg-white/30 p-4 rounded-xl">
						<input
							type="email"
							placeholder="Email"
							className="px-3 py-2 rounded-lg border focus:ring-2 focus:ring-indigo-400 outline-none"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
						/>
						<input
							type="password"
							placeholder="Password"
							className="px-3 py-2 rounded-lg border focus:ring-2 focus:ring-indigo-400 outline-none"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
						/>
						<div className="flex gap-2">
							<button
								onClick={handleSignUp}
								className="flex-1 bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700"
							>
								註冊
							</button>
							<button
								onClick={handleSignIn}
								className="flex-1 bg-emerald-600 text-white py-2 rounded-lg hover:bg-emerald-700"
							>
								登入
							</button>
						</div>
					</div>
				)}
			</div>

			{/* 2. 主卡片區塊 */}
			<div className="max-w-md mx-auto bg-white/90 backdrop-blur-sm rounded-2xl shadow-2xl p-8 transition-all hover:shadow-indigo-500/20">
				<h1 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 mb-8 text-center">
					即時互動留言板
				</h1>

				{/* 3. 輸入框區塊：只有登入後才顯示，或者顯示「請先登入」 */}
				{user ? (
					<div className="flex gap-2 mb-6">
						<input
							ref={inputRef}
							type="text"
							className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
							placeholder={isLoading ? "傳送中..." : "你想說什麼？"}
							disabled={isLoading}
							value={message}
							onChange={(e) => setMessage(e.target.value)}
							onKeyDown={handleKeyDown}
						/>
						<button
							onClick={sendMessage}
							disabled={isLoading}
							className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition"
						>
							{isLoading ? "..." : "送出"}
						</button>
					</div>
				) : (
					<div className="bg-gray-100 p-4 rounded-lg text-center mb-6 text-gray-500 italic">
						請登入後開始留言
					</div>
				)}

				{/* 4. 留言列表區塊 */}
				<div className="space-y-4">
					{list.map((item: any) => (
						<div
							key={item.id}
							className="group relative bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:border-blue-300 transition-all"
						>
							{/* 修正點：確保 text-gray-800 或 text-black，不要用 text-white */}
							<p className="text-slate-800 break-words font-medium">
								{item.content}
							</p>

							<div className="mt-3 flex items-center gap-4">
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

							{/* 刪除按鈕 */}
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

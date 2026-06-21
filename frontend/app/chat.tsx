import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { commonStyles, theme } from "../constants/appTheme";
import { ProfileAvatar } from "../components/ProfileBits";
import API, { connectWebSocket, createChatMessage } from "../services/api";
import { displayName, formatDateTime } from "../services/format";
import { showToast } from "../services/toast";

type Message = {
  id: string;
  content: string;
  sender?: { id: string; email?: string; first_name?: string; last_name?: string; full_name?: string; role?: string };
  timestamp?: string;
};

export default function ChatScreen() {
  const { name, roomId: roomIdParam, chatId, room_id } = useLocalSearchParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [content, setContent] = useState("");
  const [connected, setConnected] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [room, setRoom] = useState<any>(null);
  const socketRef = useRef<{ close: () => void; send: (data: string) => boolean } | null>(null);
  const listRef = useRef<FlatList<Message>>(null);
  const router = useRouter();

  const rawRoomId = roomIdParam || chatId || room_id;
  const roomId = Array.isArray(rawRoomId) ? rawRoomId[0] : rawRoomId;
  const title = Array.isArray(name) ? name[0] : name;

  useEffect(() => {
    const loadCurrentUser = async () => {
      const stored = await AsyncStorage.getItem("userId");
      if (stored) {
        setCurrentUserId(stored);
        return;
      }
      try {
        const res = await API.get("/accounts/users/me/");
        setCurrentUserId(res.data.id);
        await AsyncStorage.setItem("userId", res.data.id);
      } catch (err) {
        console.log(err);
      }
    };
    loadCurrentUser();
  }, []);

  useEffect(() => {
    console.log("[Chat] roomId:", roomId);
  }, [roomId]);

  const fetchMessages = useCallback(async () => {
    if (!roomId) return;
    try {
      const roomRes = await API.get(`/chat/rooms/${roomId}/`);
      setRoom(roomRes.data);
      const res = await API.get(`/chat/rooms/${roomId}/messages/`);
      const data = res.data.results || res.data;
      console.log("[Chat] messages response:", data);
      setMessages(Array.isArray(data) ? data : []);
    } catch (err) {
      console.log(err);
      showToast("Could not load messages.", "error");
    }
  }, [roomId]);

  const otherUser = room
    ? room.client?.id === currentUserId
      ? room.artisan
      : room.client
    : null;
  const otherProfile = room
    ? room.client?.id === currentUserId
      ? room.artisan_profile
      : room.client_profile
    : null;
  const headerTitle = otherUser ? displayName(otherUser) : title || "Chat";
  const headerMeta = otherUser?.role === "ARTISAN"
    ? otherProfile?.category?.name || "Artisan"
    : room?.request_service_name || "Client";

  useEffect(() => {
    let socket: { close: () => void; send: (data: string) => boolean } | null = null;

    const connect = async () => {
      if (!roomId) return;
      await fetchMessages();
      socket = await connectWebSocket(`/ws/chat/${roomId}/`, {
        onopen: () => setConnected(true),
        onclose: () => setConnected(false),
        onerror: () => setConnected(false),
        onmessage: (event: MessageEvent) => {
          console.log("[Chat] websocket event:", event.data);
          const message = JSON.parse(event.data);
          if (message.type === "new_message") {
            const incoming = message.payload;
            setMessages((current) => {
              if (current.some((item) => item.id === incoming.id)) return current;
              return [...current, incoming];
            });
          }
        },
      });
      socketRef.current = socket;
    };

    connect();
    return () => {
      socket?.close();
      socketRef.current = null;
    };
  }, [fetchMessages, roomId]);

  const sendMessage = async () => {
    const text = content.trim();
    if (!text || !roomId) {
      if (text) showToast("Chat room is not ready yet.", "error");
      return;
    }

    try {
      console.log("[Chat] sending message:", { room: roomId, content: text });
      const res = await createChatMessage({ room: roomId, content: text });
      console.log("[Chat] send response:", res.data);
      if (res.status !== 201) {
        showToast("Could not send message.", "error");
        return;
      }
      setContent("");
      setMessages((current) => {
        if (current.some((item) => item.id === res.data.id)) return current;
        return [...current, res.data];
      });
    } catch (err) {
      console.log("[Chat] send error:", err);
      showToast("Could not send message.", "error");
    }
  };

  return (
    <SafeAreaView style={commonStyles.safe} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={commonStyles.screen}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.headerProfile}
              disabled={!otherUser?.id}
              onPress={() => otherUser?.id && router.push({ pathname: "/profile/[id]" as any, params: { id: otherUser.id } })}
            >
              <ProfileAvatar profile={otherProfile} size={44} />
              <View style={styles.headerText}>
                <Text style={styles.headerName}>{headerTitle}</Text>
                <Text style={styles.headerMeta}>{headerMeta}</Text>
                <Text style={commonStyles.subtitle}>{connected ? "Live connection active" : "Connecting..."}</Text>
              </View>
            </TouchableOpacity>
          </View>

          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messages}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
            renderItem={({ item }) => {
              const mine = item.sender?.id === currentUserId;
              return (
              <View style={[styles.messageRow, mine ? styles.messageRowMine : styles.messageRowOther]}>
                <View style={[styles.messageBubble, mine ? styles.myBubble : styles.otherBubble]}>
                  <Text style={[styles.sender, mine && styles.mySender]}>{mine ? "You" : displayName(item.sender) || "Message"}</Text>
                  <Text style={[styles.body, mine && styles.myBody]}>{item.content}</Text>
                  <Text style={[styles.time, mine && styles.myTime]}>{formatDateTime(item.timestamp)}</Text>
                </View>
              </View>
              );
            }}
            ListEmptyComponent={
              <View style={commonStyles.emptyCard}>
                <Text style={commonStyles.emptyText}>No messages yet.</Text>
              </View>
            }
          />

          <View style={styles.inputRow}>
            <TextInput
              value={content}
              onChangeText={setContent}
              placeholder="Type a message..."
              style={styles.input}
            />

            <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
              <Ionicons name="send" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  keyboard: { flex: 1 },
  header: { marginBottom: 4 },
  headerProfile: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  headerText: { flex: 1 },
  headerName: { color: theme.text, fontSize: 21, fontWeight: "900" },
  headerMeta: { color: theme.muted, fontWeight: "800", marginTop: 2 },
  messages: { gap: 8, paddingBottom: 12 },
  messageRow: { width: "100%", flexDirection: "row" },
  messageRowMine: { justifyContent: "flex-end" },
  messageRowOther: { justifyContent: "flex-start" },
  messageBubble: { maxWidth: "82%", borderRadius: 8, padding: 12, gap: 4 },
  myBubble: { backgroundColor: theme.primary },
  otherBubble: { backgroundColor: "#eef2f6" },
  sender: { fontSize: 12, color: theme.muted, fontWeight: "700" },
  mySender: { color: "#dbeafe" },
  body: { color: theme.text, lineHeight: 20 },
  myBody: { color: "#fff" },
  time: { color: theme.muted, fontSize: 11, fontWeight: "700", alignSelf: "flex-end" },
  myTime: { color: "#dbeafe" },
  inputRow: { flexDirection: "row", gap: 8, paddingBottom: 10 },
  input: { flex: 1, backgroundColor: "#fff", paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: theme.border },
  sendButton: {
    width: 48,
    borderRadius: 8,
    backgroundColor: theme.accent,
    alignItems: "center",
    justifyContent: "center",
  },
});

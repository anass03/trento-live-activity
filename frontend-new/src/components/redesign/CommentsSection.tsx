import React, { useState } from "react";
import { Icon } from "../ui/Icon";

interface Comment {
  id: string;
  author: string;
  avatar: string;
  time: string;
  text: string;
}

export function CommentsSection({ accent = "var(--magenta)", user }: any) {
  const [comments, setComments] = useState<Comment[]>([
    {
      id: "1",
      author: "Giulia Bianchi",
      avatar: "GB",
      time: "2 ore fa",
      text: "Serata fantastica! Qualcuno sa se c'è un parcheggio consigliato vicino?",
    },
    {
      id: "2",
      author: "Luca Neri",
      avatar: "LN",
      time: "1 ora fa",
      text: "Il parcheggio Duomo è solitamente pieno, meglio provare a piazzale Sanseverino.",
    },
    {
      id: "3",
      author: "Sofia Rossi",
      avatar: "SR",
      time: "30 min fa",
      text: "La band locale che suona stasera è eccezionale, non vedo l'ora!",
    },
  ]);
  const [newComment, setNewComment] = useState("");

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!newComment.trim()) return;

    const added: Comment = {
      id: Date.now().toString(),
      author: user?.name || "Ospite",
      avatar: user?.avatar || (user?.name ? user.name.substring(0, 2).toUpperCase() : "OS"),
      time: "Ora",
      text: newComment.trim(),
    };

    setComments((prev) => [...prev, added]);
    setNewComment("");
  };

  return (
    <div className="comments-box">
      <div className="comments-list">
        {comments.map((c) => (
          <div key={c.id} className="comment-item">
            <div className="comment-av">{c.avatar}</div>
            <div className="comment-body">
              <div className="comment-meta">
                <span className="comment-author">{c.author}</span>
                <span className="comment-time">{c.time}</span>
              </div>
              <div className="comment-text">{c.text}</div>
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="comment-form">
        <div className="comment-input-wrap">
          <input
            type="text"
            className="comment-input"
            placeholder="Scrivi un commento pubblico..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            style={{ "--accent": accent } as React.CSSProperties}
          />
        </div>
        <button type="submit" className="comment-submit" style={{ background: accent }}>
          <Icon name="send" size={15} />
        </button>
      </form>
    </div>
  );
}

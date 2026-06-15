import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "../ui/Icon";
import { getComments, postComment, getActivityReviews, postActivityReview } from "../../lib/api";

interface Comment {
  id: string;
  author: string;
  avatar: string;
  time: string;
  text: string;
}

interface CommentsSectionProps {
  accent?: string;
  user: any;
  eventId?: string | null;
  activityId?: string | null;
}

export function CommentsSection({ accent = "var(--magenta)", user, eventId, activityId }: CommentsSectionProps) {
  const { t, i18n } = useTranslation();
  const dtLocale = i18n.language.startsWith("en") ? "en-GB" : "it-IT";
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadData = async () => {
    if (!eventId && !activityId) return;
    setLoading(true);
    setError("");
    try {
      if (eventId) {
        const raw = await getComments(eventId);
        const mapped = raw.map((c: any) => {
          const author = c.user ? `${c.user.nome} ${c.user.cognome}` : (c.nomeEnte || t("comments.defaultUser"));
          const avatar = c.nomeEnte ? c.nomeEnte.substring(0, 2).toUpperCase() : (c.user?.nome ? c.user.nome[0].toUpperCase() : "U");
          return {
            id: c.id,
            author,
            avatar,
            time: c.createdAt ? new Date(c.createdAt).toLocaleDateString(dtLocale) : t("comments.recent"),
            text: c.text
          };
        });
        setComments(mapped);
      } else if (activityId) {
        const raw = await getActivityReviews(activityId);
        const mapped = raw.map((c: any) => {
          const author = c.user ? `${c.user.nome} ${c.user.cognome}` : t("comments.defaultUser");
          const avatar = c.user?.nome ? c.user.nome[0].toUpperCase() : "U";
          return {
            id: c.id,
            author,
            avatar,
            time: c.createdAt ? new Date(c.createdAt).toLocaleDateString(dtLocale) : t("comments.recent"),
            text: c.comment || t("comments.noTextComment")
          };
        });
        setComments(mapped);
      }
    } catch (err: any) {
      console.error(err);
      setError(t("comments.loadError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [eventId, activityId]);

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!newComment.trim()) return;
    if (user?.role === "anonymous") {
      setError(t("comments.loginRequired"));
      return;
    }

    setError("");
    try {
      if (eventId) {
        await postComment(eventId, newComment.trim());
        setNewComment("");
        loadData();
      } else if (activityId) {
        // Post review with default 5-star rating metrics
        await postActivityReview(activityId, {
          ratingOverall: 5,
          ratingAccuracy: 5,
          ratingOrganization: 5,
          ratingSafety: 5,
          ratingAtmosphere: 5,
          comment: newComment.trim()
        });
        setNewComment("");
        loadData();
      }
    } catch (err: any) {
      setError(err.message || t("comments.sendError"));
    }
  };

  return (
    <div className="comments-box">
      {error && (
        <div className="revamp-status-pill danger" style={{ marginBottom: 12, justifyContent: "center", fontSize: 12 }}>
          {error}
        </div>
      )}

      {loading && comments.length === 0 ? (
        <div style={{ color: "var(--text-muted)", fontSize: 13, padding: "10px 0", textAlign: "center" }}>
          {t("comments.loading")}
        </div>
      ) : (
        <div className="comments-list" style={{ maxHeight: "250px", overflowY: "auto" }}>
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
          {comments.length === 0 && (
            <div style={{ color: "var(--text-muted)", fontSize: 13, padding: "10px 0", textAlign: "center" }}>
              {t("comments.empty")}
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="comment-form" style={{ marginTop: 12 }}>
        <div className="comment-input-wrap">
          <input
            type="text"
            className="comment-input"
            placeholder={user?.role === "anonymous" ? t("comments.placeholderLogin") : t("comments.placeholder")}
            value={newComment}
            disabled={user?.role === "anonymous"}
            onChange={(e) => setNewComment(e.target.value)}
            style={{ "--accent": accent } as React.CSSProperties}
          />
        </div>
        <button type="submit" className="comment-submit" style={{ background: accent }} disabled={user?.role === "anonymous"}>
          <Icon name="send" size={15} />
        </button>
      </form>
    </div>
  );
}

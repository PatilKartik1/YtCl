import React, { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { formatDistanceToNow } from "date-fns";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { toast } from "sonner";

interface Comment {
  _id: string;
  videoid: string;
  userid: string;
  commentbody: string;
  usercommented: string;
  city: string;
  commentedon: string;
  likes: string[];
  dislikes: string[];
}

const Comments = ({ videoId, id }: { videoId: any; id?: string }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const { user } = useUser();
  const [loading, setLoading] = useState(true);

  const [translatedComments, setTranslatedComments] = useState<{
    [key: string]: string;
  }>({});
  const [translatingId, setTranslatingId] = useState<string | null>(null);
  const [showLangPicker, setShowLangPicker] = useState<string | null>(null);

  const languages = [
    { code: "hi", label: "Hindi" },
    { code: "mr", label: "Marathi" },
    { code: "en", label: "English" },
    { code: "fr", label: "French" },
    { code: "es", label: "Spanish" },
    { code: "de", label: "German" },
    { code: "ja", label: "Japanese" },
    { code: "ko", label: "Korean" },
    { code: "zh", label: "Chinese" },
    { code: "ar", label: "Arabic" },
  ];

  useEffect(() => {
    loadComments();
  }, [videoId]);

  const loadComments = async () => {
    try {
      const res = await axiosInstance.get(`/comment/${videoId}`);
      setComments(res.data);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading comments...</div>;
  }

  const handleSubmitComment = async () => {
    if (!user || !newComment.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await axiosInstance.post("/comment/postcomment", {
        videoid: videoId,
        commentbody: newComment,
        usercommented: user.name,
        city: user.city,
      });
      if (res.data.comment) {
        const newCommentObj: Comment = {
          _id: Date.now().toString(),
          videoid: videoId,
          userid: user._id,
          commentbody: newComment,
          usercommented: user.name || "Anonymous",
          city: user.city || "",
          commentedon: new Date().toISOString(),
          likes: [],
          dislikes: [],
        };
        setComments([newCommentObj, ...comments]);
      }
      setNewComment("");
    } catch (error: any) {
      if (error.response?.status === 400) {
        alert(error.response.data.message);
        return;
      }
      console.error(error);
      alert("Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (comment: Comment) => {
    setEditingCommentId(comment._id);
    setEditText(comment.commentbody);
  };

  const handleUpdateComment = async () => {
    if (!editText.trim()) return;
    try {
      const res = await axiosInstance.post(
        `/comment/editcomment/${editingCommentId}`,
        { commentbody: editText },
      );
      if (res.data) {
        setComments((prev) =>
          prev.map((c) =>
            c._id === editingCommentId ? { ...c, commentbody: editText } : c,
          ),
        );
        setEditingCommentId(null);
        setEditText("");
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await axiosInstance.delete(`/comment/deletecomment/${id}`);
      if (res.data.comment) {
        setComments((prev) => prev.filter((c) => c._id !== id));
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleLike = async (commentId: string) => {
    if (!user) {
      toast.error("Please sign in to like comments");
      return;
    }
    try {
      const response = await axiosInstance.patch(`/comment/like/${commentId}`);
      setComments((prev) =>
        prev.map((c) =>
          c._id === commentId ? { ...c, likes: response.data.likes } : c,
        ),
      );
    } catch (error) {
      console.log(error);
    }
  };

  const handleDislike = async (commentId: string) => {
    if (!user) {
      toast.error("Please sign in to dislike comments");
      return;
    }
    try {
      const response = await axiosInstance.patch(
        `/comment/dislike/${commentId}`
      );
      if (response.data.deleted) {
        // Auto-removed due to 2 dislikes
        setComments((prev) => prev.filter((c) => c._id !== commentId));
      } else {
        // Update dislikes in state
        setComments((prev) =>
          prev.map((c) =>
            c._id === commentId
              ? { ...c, dislikes: response.data.dislikes }
              : c,
          ),
        );
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleTranslate = async (
    commentId: string,
    text: string,
    targetLang: string,
  ) => {
    setTranslatingId(commentId);
    setShowLangPicker(null);
    try {
      const res = await fetch(
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=autodetect|${targetLang}`,
      );
      const data = await res.json();
      const translated = data.responseData.translatedText;
      setTranslatedComments((prev) => ({
        ...prev,
        [commentId]: translated,
      }));
    } catch (error) {
      console.log("Translation error:", error);
      alert("Translation failed, please try again.");
    } finally {
      setTranslatingId(null);
    }
  };

  const handleShowOriginal = (commentId: string) => {
    setTranslatedComments((prev) => {
      const updated = { ...prev };
      delete updated[commentId];
      return updated;
    });
  };

  return (
    <div id={id} className="space-y-6 scroll-mt-24">
      <h2 className="text-xl font-semibold">{comments.length} Comments</h2>

      {user && (
        <div className="flex gap-4">
          <Avatar className="w-10 h-10">
            <AvatarImage src={user.image || ""} />
            <AvatarFallback>{user.name?.[0] || "U"}</AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-2">
            <Textarea
              placeholder="Add a comment..."
              value={newComment}
              onChange={(e: any) => setNewComment(e.target.value)}
              className="min-h-[80px] resize-none border-0 border-b-2 rounded-none focus-visible:ring-0"
            />
            <div className="flex gap-2 justify-end">
              <Button
                variant="ghost"
                onClick={() => setNewComment("")}
                disabled={!newComment.trim()}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitComment}
                disabled={!newComment.trim() || isSubmitting}
              >
                Comment
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {comments.length === 0 ? (
          <p className="text-sm text-gray-500 italic">
            No comments yet. Be the first to comment!
          </p>
        ) : (
          comments.map((comment) => (
            <div key={comment._id} className="flex gap-4">
              <Avatar className="w-10 h-10">
                <AvatarImage src="/placeholder.svg?height=40&width=40" />
                <AvatarFallback>{comment.usercommented[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">
                    {comment.usercommented}
                  </span>
                  {comment.city && (
                    <span className="text-xs text-gray-500">
                      • {comment.city}
                    </span>
                  )}
                  <span className="text-xs text-gray-600">
                    {formatDistanceToNow(new Date(comment.commentedon))} ago
                  </span>
                </div>

                {editingCommentId === comment._id ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                    />
                    <div className="flex gap-2 justify-end">
                      <Button
                        onClick={handleUpdateComment}
                        disabled={!editText.trim()}
                      >
                        Save
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setEditingCommentId(null);
                          setEditText("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Comment body — shows translated or original */}
                    <p className="text-sm">
                      {translatedComments[comment._id] || comment.commentbody}
                    </p>

                    {/* Translate controls */}
                    <div className="relative mt-1">
                      {translatedComments[comment._id] ? (
                        <button
                          className="text-xs text-blue-500 hover:underline"
                          onClick={() => handleShowOriginal(comment._id)}
                        >
                          Show Original
                        </button>
                      ) : (
                        <button
                          className="text-xs text-gray-400 hover:text-blue-500"
                          onClick={() =>
                            setShowLangPicker(
                              showLangPicker === comment._id
                                ? null
                                : comment._id,
                            )
                          }
                        >
                          {translatingId === comment._id
                            ? "Translating..."
                            : "Translate"}
                        </button>
                      )}

                      {/* Language picker dropdown */}
                      {showLangPicker === comment._id && (
                        <div className="absolute z-10 mt-1 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg shadow-lg p-2 grid grid-cols-2 gap-1 w-48">
                          {languages.map((lang) => (
                            <button
                              key={lang.code}
                              className="text-xs text-left px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-zinc-700"
                              onClick={() =>
                                handleTranslate(
                                  comment._id,
                                  comment.commentbody,
                                  lang.code,
                                )
                              }
                            >
                              {lang.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-3 mt-2">
                      <button
                        className="text-sm flex items-center gap-1 hover:text-blue-500 transition-colors"
                        onClick={() => handleLike(comment._id)}
                      >
                        👍 {comment.likes?.length || 0}
                      </button>
                      <button
                        className="text-sm flex items-center gap-1 hover:text-red-500 transition-colors"
                        onClick={() => handleDislike(comment._id)}
                      >
                        👎 {comment.dislikes?.length || 0}
                      </button>
                    </div>

                    {comment.userid === user?._id && (
                      <div className="flex gap-2 mt-2 text-sm text-gray-500">
                        <button onClick={() => handleEdit(comment)}>
                          Edit
                        </button>
                        <button onClick={() => handleDelete(comment._id)}>
                          Delete
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Comments;

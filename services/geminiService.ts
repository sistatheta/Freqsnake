export const getGameOverCommentary = async (score: number): Promise<string> => {
  try {
    const res = await fetch('/api/commentary', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ score }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => null);
      if (errData?.fallback) return errData.fallback;
      return "Track ended! Keep spinning the vinyl, DJ.";
    }

    const data = await res.json();
    return data.commentary || "Great rhythm, Maestro!";
  } catch (error) {
    console.error("Commentary request error:", error);
    return "Track ended! Practice makes virtuoso.";
  }
};
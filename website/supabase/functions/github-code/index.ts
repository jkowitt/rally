import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const token = Deno.env.get("GITHUB_TOKEN");
    if (!token) throw new Error("GITHUB_TOKEN not set");

    const body = await req.json();
    const { action } = body;

    const owner = "jkowitt";
    const repo = "rally";
    const branch = "main";

    if (action === "read_file") {
      const { path } = body;
      const resp = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github.v3+json" },
      });
      if (!resp.ok) throw new Error(`File not found: ${path}`);
      const data = await resp.json();
      const content = atob(data.content);
      return new Response(JSON.stringify({ content, sha: data.sha }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "write_file") {
      const { path, content, message } = body;

      // Get current file SHA (needed for updates)
      let sha = body.sha;
      if (!sha) {
        try {
          const resp = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`, {
            headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github.v3+json" },
          });
          if (resp.ok) {
            const data = await resp.json();
            sha = data.sha;
          }
        } catch { /* new file */ }
      }

      const payload: any = {
        message: message || `Claude Code: update ${path}`,
        content: btoa(unescape(encodeURIComponent(content))),
        branch,
      };
      if (sha) payload.sha = sha;

      const resp = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(`GitHub API error ${resp.status}: ${errText}`);
      }

      const result = await resp.json();
      return new Response(JSON.stringify({
        success: true,
        commit_sha: result.commit?.sha,
        commit_url: result.commit?.html_url,
        path,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "list_files") {
      const { path } = body;
      const resp = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path || "website/src"}?ref=${branch}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github.v3+json" },
      });
      if (!resp.ok) throw new Error("Could not list files");
      const data = await resp.json();
      const files = Array.isArray(data) ? data.map((f: any) => ({ name: f.name, path: f.path, type: f.type })) : [];
      return new Response(JSON.stringify({ files }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Unknown action: " + action);
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

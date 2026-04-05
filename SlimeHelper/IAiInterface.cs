//var url = $"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key={apiKey}";
using System.Net.Http;
using System.Text;
using System.Text.Json;

namespace SlimeHelper
{
    public class ChatMessage
    {
        public string role { get; set; }
        public List<Part> parts { get; set; }
    }

    public class Part
    {
        public string text { get; set; }
    }

    public interface IAiProvider
    {
        Task<string> GetResponseAsync(string prompt, string apiKey);
    }

    public class GeminiProvider : IAiProvider
    {
        private static List<ChatMessage> _history = new List<ChatMessage>();

        private string _permanentMemory = "User Name: Mikael. Project: Slime Helper (WPF + VS Code Extension). Tone: Helpful but a bit sassy anime slime.";

        public async Task<string> GetResponseAsync(string prompt, string apiKey)
        {
            using var client = new HttpClient();

            var url = $"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key={apiKey}";

            var newUserMessage = new ChatMessage
            {
                role = "user",
                parts = new List<Part> { new Part { text = prompt } }
            };

            var requestBody = new
            {
                system_instruction = new { parts = new[] { new { text = _permanentMemory } } },
                contents = _history.Concat(new[] { newUserMessage }).ToArray()
            };

            var content = new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json");

            try
            {
                var response = await client.PostAsync(url, content);
                var jsonResponse = await response.Content.ReadAsStringAsync();

                using var doc = JsonDocument.Parse(jsonResponse);
                var root = doc.RootElement;

                if (root.TryGetProperty("error", out var errorElement))
                {
                    string msg = errorElement.GetProperty("message").GetString();
                    if (msg.Contains("Quota exceeded"))
                    {
                        return "I'm a bit tired from all the thinking! Give me a minute to rest my slime-brain... 😴";
                    }
                    return "API Error: " + msg;
                }

                var aiText = root.GetProperty("candidates")[0]
                                 .GetProperty("content")
                                 .GetProperty("parts")[0]
                                 .GetProperty("text")
                                 .GetString();

                AddToHistory(prompt, aiText);

                return aiText;
            }
            catch (Exception ex)
            {
                return $"I received a weird response I couldn't parse. Error: {ex.Message}";
            }
        }

        private void AddToHistory(string userPrompt, string aiResponse)
        {
            _history.Add(new ChatMessage { role = "user", parts = new List<Part> { new Part { text = userPrompt } } });
            _history.Add(new ChatMessage { role = "model", parts = new List<Part> { new Part { text = aiResponse } } });

            if (_history.Count > 10)
            {
                _history.RemoveRange(0, 2);
            }
        }

        public static List<ChatMessage> GetHistory() => _history;
    }
}
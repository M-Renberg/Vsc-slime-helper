namespace SlimeHelper
{
    public static class AiService
    {
        public static async Task<string> AskSlime(string userPrompt)
        {
            var config = EmailService.GetConfig();

            if (string.IsNullOrEmpty(config.geminiKey) ||
                config.geminiKey == "Enter your key here!")
            {
                return "My brain is empty! Please set my Gemini API Key in the settings menu first. 🧠💨";
            }

            IAiProvider provider = new GeminiProvider();

            string fullPrompt = $"You are a witty, slightly snarky Slime assistant for a software developer. Keep your answers concise, helpful, and fun: {userPrompt}";

            try
            {
                return await provider.GetResponseAsync(fullPrompt, config.geminiKey);
            }
            catch (Exception ex)
            {
                return $"Ugh, my brain hurts... (Error: {ex.Message})";
            }
        }
    }
}
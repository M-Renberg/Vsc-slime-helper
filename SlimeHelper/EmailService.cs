using System.IO;
using System.Text.Json;

namespace SlimeHelper
{

    public class EmailConfig
    {
        public string smtpServer { get; set; }
        public string geminiKey { get; set; }
        public string openaiKey { get; set; }
    }
    public static class EmailService
    {

        public static EmailConfig GetConfig()
        {
            try
            {
                // Skapar en permanent sökväg: C:\Users\Mikael\AppData\Local\SlimeHelper
                string appDataPath = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
                string folderPath = Path.Combine(appDataPath, "SlimeHelper");
                string configPath = Path.Combine(folderPath, "db-config.json");

                // Skapa mappen om den inte finns
                if (!Directory.Exists(folderPath))
                {
                    Directory.CreateDirectory(folderPath);
                }

                // Om filen inte finns, skapa en mall så användaren vet vad som ska fyllas i
                if (!File.Exists(configPath))
                {
                    var template = new EmailConfig
                    {
                        geminiKey = "Klistra in din Gemini-nyckel här",
                        openaiKey = "Klistra in din OpenAI-nyckel här"
                    };
                    string json = JsonSerializer.Serialize(template, new JsonSerializerOptions { WriteIndented = true });
                    File.WriteAllText(configPath, json);
                    return template;
                }

                var configJson = File.ReadAllText(configPath);
                var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
                return JsonSerializer.Deserialize<EmailConfig>(configJson, options);
            }
            catch (Exception ex)
            {
                Console.WriteLine("Kunde inte hantera config: " + ex.Message);
                return new EmailConfig();
            }
        }
        public static void SaveConfig(EmailConfig config)
        {
            try
            {
                string appDataPath = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
                string folderPath = Path.Combine(appDataPath, "SlimeHelper");
                string configPath = Path.Combine(folderPath, "db-config.json");

                if (!Directory.Exists(folderPath)) Directory.CreateDirectory(folderPath);

                string json = JsonSerializer.Serialize(config, new JsonSerializerOptions { WriteIndented = true });
                File.WriteAllText(configPath, json);
            }
            catch (Exception ex)
            {
                System.Windows.MessageBox.Show("Kunde inte spara nyckeln: " + ex.Message);
            }
        }
    }
}
using System;
using System.ComponentModel;
using System.IO;
using System.Media;
using System.Security.Cryptography;
using System.Text.Json;
using System.Windows;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using System.Windows.Threading;

namespace SlimeHelper
{
    public partial class MainWindow : Window
    {
        private string statusFilePath;
        private DispatcherTimer checkTimer;
        private bool isInteracting = false;
        private Random rng = new Random();
        private string lastStatus = "";
        private double currentVolume = 0.5;
        private MediaPlayer mediaPlayer = new MediaPlayer();
        private Point startWindowPos;
        private DispatcherTimer blinkTimer;

        public MainWindow()
        {
            InitializeComponent();

            statusFilePath = Path.Combine(Path.GetTempPath(), "slime_status.txt");

            checkTimer = new DispatcherTimer();
            checkTimer.Interval = TimeSpan.FromSeconds(1);
            checkTimer.Tick += CheckStatus;
            checkTimer.Start();

            //drag function
            this.MouseLeftButtonDown += (s, e) =>
            {
                startWindowPos = new Point(this.Left, this.Top);
                this.DragMove();
            };

            this.MouseLeftButtonUp += (s, e) =>
            {
                double distanceMoved = Math.Abs(this.Left - startWindowPos.X)
                                     + Math.Abs(this.Top - startWindowPos.Y);

                if (distanceMoved < 5)
                {
                    PokeSlime(); //poke
                }
            };
            //open menu
            this.MouseRightButtonUp += (s, e) =>
            {
                if (this.ContextMenu != null)
                {
                    this.ContextMenu.IsOpen = true;
                }
            };
            //blink function
            blinkTimer = new DispatcherTimer();
            blinkTimer.Tick += TryBlink;
            blinkTimer.Interval = TimeSpan.FromSeconds(7);
            blinkTimer.Start();
        }

        private void TryBlink(object sender, EventArgs e) //blink logic
        {
            if (lastStatus == "IDLE" && !isInteracting)
            {
                if (rng.Next(0, 10) < 3)
                {
                    UpdateImage("slime_blink.png");

                    var timer = new DispatcherTimer { Interval = TimeSpan.FromMilliseconds(200) };
                    timer.Tick += (s, args) =>
                    {
                        if (lastStatus == "IDLE") UpdateImage("slime_idle.png");
                        timer.Stop();
                    };
                    timer.Start();
                }
            }
        }

        private void VolumeChanged(object sender, RoutedPropertyChangedEventArgs<double> e) //control sound/volume on fx
        {
            currentVolume = e.NewValue;

        }

        private void CloseApp(object sender, RoutedEventArgs e) //close slime
        {
            Application.Current.Shutdown();
        }

        private void PlaySounds(string soundFile) //fx sounds logic
        {
            try
            {
                string path = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "Sounds", soundFile);
                if (File.Exists(path))
                {
                    mediaPlayer.Open(new Uri(path));
                    mediaPlayer.Volume = currentVolume;
                    mediaPlayer.Play();
                }
            }
            catch
            {

            }
        }
        private void PokeSlime() //poke slime logic
        {
            if (isInteracting) return;
            isInteracting = true;

            PlaySounds("Poke.wav");

            UpdateImage("slime_poke.png");

            string[] textLinesPoked = new string[] //poke comments from slime
            {
                "Don't poke me!",
                "Get back to coding!",
                "Careful! I'm squishy...",
                "Is it time for a break?",
                "You should focus on your code",
                "Hey! Don't to that!",
                "I want cake...",
                "Squish!",
                "Maybe just one more poke?",
                "Have you saved and commited your code?",
                "Slime is doing slime stuff"
            };

            int index = rng.Next(textLinesPoked.Length);

            SpeechText.Text = textLinesPoked[index];
            SpeechText.Foreground = Brushes.Black;
            SpeechBubble.Visibility = Visibility.Visible;

            var resetTimer = new DispatcherTimer();
            resetTimer.Interval = TimeSpan.FromSeconds(2);
            resetTimer.Tick += (s, args) =>
            {
                isInteracting = false;
                SpeechBubble.Visibility = Visibility.Collapsed;
                CheckStatus(null, null);
                resetTimer.Stop();
            };
            resetTimer.Start();

        }

        private void CheckStatus(object sender, EventArgs e) //checking files
        {
            if (isInteracting) return;
            if (!File.Exists(statusFilePath)) return;

            try
            {
                string jsonContent = File.ReadAllText(statusFilePath).Trim();
                var data = JsonSerializer.Deserialize<SlimeData>(jsonContent);
                if (data == null) return;

                string imageName = "slime_idle.png";

                if (data.status != lastStatus) //sound fx
                {
                    switch (data.status)
                    {
                        case "ERROR":
                            PlaySounds("Warning.wav"); break;
                        case "WARNING":
                            PlaySounds("Warning.wav"); break;
                        case "BREAK":
                            PlaySounds("Poke.wav"); break;
                        case "IDLE":
                            if (lastStatus == "AFK")
                            {
                                PlaySounds("Poke.wav");
                            }
                            else if (lastStatus == "ERROR" || lastStatus == "WARNING")
                            {
                                PlaySounds("Idle.wav");
                            }
                            break;
                    }
                    lastStatus = data.status;
                }
                switch (data.status)
                {
                    //the image logic!!!! importent to work with if changing in the other folder!!!
                    case "ERROR": imageName = "slime_error.png"; break;
                    case "WARNING": imageName = "slime_warning.png"; break;
                    case "DIRTY": imageName = "slime_dirty.png"; break;
                    case "PUSH_NEEDED": imageName = "slime_push.png"; break;
                    case "BREAK": imageName = "slime_break.png"; break;
                    case "AFK": imageName = "slime_sleep.png"; break;
                    case "STREAK": imageName = "slime_streak.png"; break;
                    case "ANNOYED": imageName = "slime_annoyed.png"; break;
                    case "FUNNY": imageName = "slime_funny.png"; break;
                    case "SCARED": imageName = "slime_scared.png"; break;
                    case "TIRED": imageName = "slime_tired.png"; break;
                    case "POKE": imageName = "slime_poke.png"; break;
                    default: imageName = "slime_idle.png"; break;

                }
                UpdateImage(imageName);

                if (!string.IsNullOrEmpty(data.text))
                {
                    SpeechText.Text = data.text;
                    SpeechBubble.Visibility = Visibility.Visible;
                    if (data.status == "IDLE")
                    {
                        var now = DateTime.Now;

                        if (now.Hour >= 23 || now.Hour < 5)
                        {
                            SpeechText.Text = "It's late. Slime is tired...";
                            UpdateImage("slime_tired.png");
                        }
                        else if (now.DayOfWeek == DayOfWeek.Friday && now.Hour >= 15)
                        {
                            SpeechText.Text = "It's Friday! Friday! Yey!";
                            UpdateImage("slime_streak.png");
                        }
                        else if (now.DayOfWeek == DayOfWeek.Monday && now.Hour < 9)
                        {
                            SpeechText.Text = "Monday... need coffee... ";
                            UpdateImage("slime_tired.png");
                        }
                        else if (now.DayOfWeek == DayOfWeek.Saturday || now.DayOfWeek == DayOfWeek.Sunday)
                        {
                            if (new Random().Next(0, 10) == 0)
                            {
                                SpeechText.Text = "Working on the weekend? Really?";
                            }
                        }
                    }
                    if (data.status == "ERROR") //error font color
                    {
                        SpeechText.Foreground = Brushes.Red;

                    }
                    else if (data.status == "WARNING") //warning font color
                    {
                        SpeechText.Foreground = Brushes.DarkOrange;

                    }
                    else
                    {
                        SpeechText.Foreground = Brushes.Black; //basic font color
                    }
                }
                else
                {
                    SpeechBubble.Visibility = Visibility.Collapsed;
                }
            }
            catch
            {
            }
        }


        private void UpdateImage(string imageName) //image logic
        {

            string fullPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "Images", imageName);

            if (File.Exists(fullPath))
            {

                if (SlimeImage.Source is BitmapImage currentBitmap &&
                    currentBitmap.UriSource.AbsolutePath.EndsWith(imageName))
                {
                    return;
                }

                var bitmap = new System.Windows.Media.Imaging.BitmapImage();
                bitmap.BeginInit();
                bitmap.UriSource = new Uri(fullPath, UriKind.Absolute);
                bitmap.CacheOption = System.Windows.Media.Imaging.BitmapCacheOption.OnLoad;
                bitmap.EndInit();

                SlimeImage.Source = bitmap;
            }
        }


        private void OnViewNotesClick(object sender, RoutedEventArgs e)
        {
            try
            {
                string commandFile = Path.Combine(Path.GetTempPath(), "slime_command.txt");

                File.WriteAllText(commandFile, "OPEN_NOTES");

                SpeechText.Text = "Opening your notes";
                SpeechText.Foreground = Brushes.Black;
                SpeechBubble.Visibility = Visibility.Visible;

                var timer = new DispatcherTimer { Interval = TimeSpan.FromSeconds(2) };
                timer.Tick += (s, args) =>
                {
                    SpeechBubble.Visibility = Visibility.Collapsed;
                    CheckStatus(null, null);
                    timer.Stop();
                };
                timer.Start();
            }
            catch (Exception ex)
            {
                SpeechText.Text = "Oops! Couldn't open notes.";
                SpeechBubble.Visibility = Visibility.Visible;
            }
        }
    }

    public class SlimeData //slime class
    {
        public string status { get; set; } //you know who is going to hate on this lol... xD
        public string text { get; set; }
    }
}
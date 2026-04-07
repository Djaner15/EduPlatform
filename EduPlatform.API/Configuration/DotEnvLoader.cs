namespace EduPlatform.API.Configuration;

public static class DotEnvLoader
{
    public static void LoadIfExists(params string[] candidatePaths)
    {
        foreach (var path in candidatePaths)
        {
            if (!File.Exists(path))
            {
                continue;
            }

            foreach (var rawLine in File.ReadAllLines(path))
            {
                var line = rawLine.Trim();

                if (string.IsNullOrWhiteSpace(line) || line.StartsWith('#'))
                {
                    continue;
                }

                var separatorIndex = line.IndexOf('=');
                if (separatorIndex <= 0)
                {
                    continue;
                }

                var key = line[..separatorIndex].Trim();
                var value = line[(separatorIndex + 1)..].Trim().Trim('"');

                if (string.IsNullOrWhiteSpace(key))
                {
                    continue;
                }

                Environment.SetEnvironmentVariable(key, value);
            }

            break;
        }
    }
}

FROM mcr.microsoft.com/dotnet/sdk:7.0 AS build
WORKDIR /src

COPY ["EduPlatform.API/EduPlatform.API.csproj", "EduPlatform.API/"]
RUN dotnet restore "EduPlatform.API/EduPlatform.API.csproj"

COPY . .
WORKDIR "/src/EduPlatform.API"
RUN dotnet publish "EduPlatform.API.csproj" \
    -c Release \
    -o /app/publish \
    --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:7.0 AS runtime
WORKDIR /app

ENV ASPNETCORE_URLS=http://+:80 \
    DOTNET_RUNNING_IN_CONTAINER=true

EXPOSE 80

COPY --from=build /app/publish .

ENTRYPOINT ["dotnet", "YourProjectName.dll"]

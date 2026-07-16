FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Copy csproj and restore as distinct layers
COPY ["CarSales.Api/CarSales.Api.csproj", "CarSales.Api/"]
RUN dotnet restore "CarSales.Api/CarSales.Api.csproj"

# Copy everything else and build
COPY . .
WORKDIR "/src/CarSales.Api"
RUN dotnet build "CarSales.Api.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "CarSales.Api.csproj" -c Release -o /app/publish

# Build runtime image
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "CarSales.Api.dll"]

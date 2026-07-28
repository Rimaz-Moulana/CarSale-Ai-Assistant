using CarSales.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace CarSales.Api.Data;

public static class DbInitializer
{
    public static void EnsureSeedData(this WebApplication app)
    {
        using var scope = app.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        context.Database.EnsureCreated();

        context.Database.ExecuteSqlRaw(@"
            CREATE TABLE IF NOT EXISTS ""CarImageVerifications"" (
                ""Id"" SERIAL PRIMARY KEY,
                ""CarId"" INTEGER NOT NULL,
                ""ChassisNumber"" VARCHAR(100) NOT NULL,
                ""Status"" VARCHAR(50) NOT NULL,
                ""DropboxPath"" VARCHAR(500) NOT NULL,
                ""ResultNotes"" TEXT NOT NULL,
                ""MismatchedFiles"" TEXT,
                ""CheckedAt"" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT ""FK_CarImageVerifications_Cars_CarId"" FOREIGN KEY (""CarId"") REFERENCES ""Cars"" (""Id"") ON DELETE CASCADE
            );
        ");

        context.Database.ExecuteSqlRaw(@"
            CREATE TABLE IF NOT EXISTS ""DropboxVehicles"" (
                ""Id"" SERIAL PRIMARY KEY,
                ""Vin"" VARCHAR(50) NOT NULL,
                ""Dealer"" VARCHAR(250) NOT NULL,
                ""FolderPath"" VARCHAR(500) NOT NULL,
                ""DateFolder"" VARCHAR(100) NOT NULL,
                ""LastSyncedAt"" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            CREATE UNIQUE INDEX IF NOT EXISTS ""IX_DropboxVehicles_Vin"" ON ""DropboxVehicles"" (""Vin"");
        ");

        context.Database.ExecuteSqlRaw(@"
            CREATE TABLE IF NOT EXISTS ""DropboxImages"" (
                ""Id"" SERIAL PRIMARY KEY,
                ""DropboxVehicleId"" INTEGER NULL,
                ""DropboxFileId"" VARCHAR(150) NOT NULL,
                ""FileName"" VARCHAR(250) NOT NULL,
                ""PathDisplay"" VARCHAR(500) NOT NULL,
                ""ContentHash"" VARCHAR(150) NOT NULL,
                ""MimeType"" VARCHAR(100) NOT NULL,
                ""ImageType"" VARCHAR(50) NOT NULL DEFAULT 'OTHER',
                ""Embedding"" REAL[] NULL,
                ""EmbeddingModel"" VARCHAR(100) NOT NULL,
                ""EmbeddingVersion"" VARCHAR(100) NOT NULL,
                ""CreatedAt"" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                ""UpdatedAt"" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT ""FK_DropboxImages_DropboxVehicles_DropboxVehicleId"" FOREIGN KEY (""DropboxVehicleId"") REFERENCES ""DropboxVehicles"" (""Id"") ON DELETE CASCADE
            );
        ");

        context.Database.ExecuteSqlRaw(@"
            CREATE TABLE IF NOT EXISTS ""VehicleMatchRequests"" (
                ""Id"" UUID PRIMARY KEY,
                ""Vin"" VARCHAR(50) NOT NULL,
                ""CarId"" INTEGER NULL,
                ""UserId"" VARCHAR(150) NULL,
                ""Status"" VARCHAR(50) NOT NULL,
                ""OverallScore"" DOUBLE PRECISION NOT NULL,
                ""Confidence"" VARCHAR(50) NOT NULL,
                ""Decision"" VARCHAR(50) NOT NULL,
                ""CreatedAt"" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                ""CompletedAt"" TIMESTAMP WITH TIME ZONE NULL,
                ""ErrorMessage"" TEXT NULL,
                CONSTRAINT ""FK_VehicleMatchRequests_Cars_CarId"" FOREIGN KEY (""CarId"") REFERENCES ""Cars"" (""Id"") ON DELETE SET NULL
            );
        ");

        context.Database.ExecuteSqlRaw(@"
            CREATE TABLE IF NOT EXISTS ""VehicleImageMatches"" (
                ""Id"" SERIAL PRIMARY KEY,
                ""MatchRequestId"" UUID NOT NULL,
                ""VehicleImageId"" VARCHAR(500) NOT NULL,
                ""DropboxImageId"" INTEGER NOT NULL,
                ""SimilarityScore"" DOUBLE PRECISION NOT NULL,
                ""Decision"" VARCHAR(50) NOT NULL,
                ""CreatedAt"" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT ""FK_VehicleImageMatches_VehicleMatchRequests_MatchRequestId"" FOREIGN KEY (""MatchRequestId"") REFERENCES ""VehicleMatchRequests"" (""Id"") ON DELETE CASCADE,
                CONSTRAINT ""FK_VehicleImageMatches_DropboxImages_DropboxImageId"" FOREIGN KEY (""DropboxImageId"") REFERENCES ""DropboxImages"" (""Id"") ON DELETE RESTRICT
            );
        ");

        context.Database.ExecuteSqlRaw(@"
            ALTER TABLE ""Cars"" ADD COLUMN IF NOT EXISTS ""Images"" TEXT;
            UPDATE ""Cars"" SET ""Images"" = '[]' WHERE ""Images"" IS NULL;
            ALTER TABLE ""Cars"" ALTER COLUMN ""PurchasePrice"" TYPE NUMERIC(18,2);
            ALTER TABLE ""Cars"" ALTER COLUMN ""SellingPrice"" TYPE NUMERIC(18,2);
            ALTER TABLE ""Sales"" ALTER COLUMN ""TotalAmount"" TYPE NUMERIC(18,2);
            ALTER TABLE ""PurchaseOrders"" ALTER COLUMN ""TotalAmount"" TYPE NUMERIC(18,2);
            ALTER TABLE ""Expenses"" ALTER COLUMN ""Amount"" TYPE NUMERIC(18,2);
            ALTER TABLE ""Payments"" ALTER COLUMN ""Amount"" TYPE NUMERIC(18,2);

            ALTER TABLE ""Sales"" DROP CONSTRAINT IF EXISTS ""FK_Sales_Cars_CarId"";
            ALTER TABLE ""Sales"" ADD CONSTRAINT ""FK_Sales_Cars_CarId"" FOREIGN KEY (""CarId"") REFERENCES ""Cars"" (""Id"") ON DELETE CASCADE;

            ALTER TABLE ""VehicleImageMatches"" DROP CONSTRAINT IF EXISTS ""FK_VehicleImageMatches_DropboxImages_DropboxImageId"";
            ALTER TABLE ""VehicleImageMatches"" ADD CONSTRAINT ""FK_VehicleImageMatches_DropboxImages_DropboxImageId"" FOREIGN KEY (""DropboxImageId"") REFERENCES ""DropboxImages"" (""Id"") ON DELETE CASCADE;
        ");

        if (context.Cars.Any() || context.Customers.Any() || context.Suppliers.Any())
        {
            return;
        }

        var random = new Random(42);

        var suppliers = CreateSuppliers(random);
        var users = CreateUsers(random);
        var customers = CreateCustomers(random);
        var cars = CreateCars(random, suppliers);
        var inventories = CreateInventories(random, cars);
        var purchaseOrders = CreatePurchaseOrders(random, suppliers, users);
        var sales = CreateSales(random, cars, customers, users);
        var payments = CreatePayments(random, sales);

        context.AddRange(suppliers);
        context.AddRange(users);
        context.AddRange(customers);
        context.AddRange(cars);
        context.AddRange(inventories);
        context.AddRange(purchaseOrders);
        context.AddRange(sales);
        context.AddRange(payments);

        context.SaveChanges();
    }

    private static List<Supplier> CreateSuppliers(Random random)
    {
        var supplierNames = new[]
        {
            "Summit Auto Parts", "Midtown Motors", "Northside Vehicle Supply", "Premier Fleet Suppliers",
            "Continental Car Traders", "Bayview Auto Group", "Lakeside Distributors", "Velocity Auto Supply",
            "Foundry Motors", "Heritage Automotive", "Atlas Vehicle Partners", "Riverside Car Sources",
            "Silverline Auto", "Crestpoint Suppliers", "Skybridge Motors", "Parkside Automobile Supply",
            "Ironwood Auto", "Canyon Vehicle Imports", "Pioneer Auto Supply", "Vanguard Car Source"
        };

        var contacts = new[]
        {
            "Kayla Greene", "Noah Patel", "Mia Lopez", "Liam Bennett", "Avery Price", "Ethan Brooks",
            "Chloe Rivera", "Mason Fox", "Sophia Turner", "Jackson Lee", "Olivia Walker", "Lucas Morgan",
            "Ella Hughes", "Logan Carter", "Grace Diaz", "Caleb Bennett", "Zoe Long", "Gabriel Reed",
            "Lily Scott", "Isaac Perry"
        };

        var addresses = new[]
        {
            "1048 Cedar Street", "2210 Maple Avenue", "759 Harbor Boulevard", "1341 Ridge Road",
            "560 Elm Drive", "3112 Oak Lane", "8020 Aspen Way", "1972 Willow Court",
            "4261 Pine Terrace", "9197 Birch Parkway", "5183 Sycamore Street", "720 Huntington Avenue",
            "2401 Spruce Circle", "1827 Magnolia Court", "3065 Chestnut Drive", "2189 Juniper Road",
            "3347 Redwood Street", "4910 Sequoia Lane", "1259 Aspen Drive", "8076 Cypress Way"
        };

        var states = new[] { "CA", "TX", "FL", "NY", "IL", "WA", "CO", "GA", "NC", "NV" };

        return supplierNames.Select((name, index) => new Supplier
        {
            Name = name,
            ContactName = contacts[index],
            Email = name.Replace(" ", "").ToLowerInvariant() + "@suppliermail.com",
            Phone = $"(555) {randomNumericString(3)}-{randomNumericString(4)}",
            Address = $"{addresses[index]}, {states[index % states.Length]}",
            CreatedAt = RandomDate(random, 600)
        }).ToList();
    }

    private static List<User> CreateUsers(Random random)
    {
        var employees = new[]
        {
            ("Ava Reed", "ava.reed"),
            ("Noah Morgan", "noah.morgan"),
            ("Mia Carter", "mia.carter"),
            ("Ethan Brooks", "ethan.brooks"),
            ("Sophia Grant", "sophia.grant"),
            ("Liam Howard", "liam.howard")
        };

        return employees.Select((employee, index) => new User
        {
            FullName = employee.Item1,
            Username = employee.Item2,
            Email = employee.Item2 + "@carsales.local",
            PasswordHash = "DemoPasswordHash",
            Role = index == 0 ? "Manager" : "Sales",
            CreatedAt = DateTime.UtcNow.AddDays(-random.Next(90, 720))
        }).ToList();
    }

    private static List<Customer> CreateCustomers(Random random)
    {
        var firstNames = new[] { "Emma", "Noah", "Olivia", "Liam", "Ava", "Ethan", "Sophia", "Mason", "Isabella", "Logan", "Mia", "Lucas", "Amelia", "Caleb", "Harper", "Jackson", "Grace", "Aiden", "Zoe", "Jacob" };
        var lastNames = new[] { "Walker", "Hughes", "Morgan", "Barnes", "James", "Brooks", "Reed", "Bennett", "Foster", "Price", "Cole", "Perry", "Coleman", "Sanders", "Green", "Ortiz", "Diaz", "Olson", "Molina", "Schneider" };
        var streets = new[] { "Applewood", "Brookfield", "Canyon", "Dover", "Evergreen", "Fairview", "Greenwood", "Hillcrest", "Ivy", "Juniper", "Kingston", "Liberty", "Maple", "Northview", "Oakridge", "Parkview", "Quince", "Ridge", "Valley", "Willow" };
        var states = new[] { "CA", "TX", "FL", "NY", "IL", "OH", "MI", "PA", "AZ", "CO" };

        var customers = new List<Customer>(150);

        for (var i = 1; i <= 150; i++)
        {
            var firstName = firstNames[random.Next(firstNames.Length)];
            var lastName = lastNames[random.Next(lastNames.Length)];
            var fullName = $"{firstName} {lastName}";
            var email = $"{firstName.ToLowerInvariant()}.{lastName.ToLowerInvariant()}{i}@example.com";
            var phone = $"(555) {randomNumericString(3)}-{randomNumericString(4)}";
            var address = $"{random.Next(100, 9999)} {streets[random.Next(streets.Length)]} St, {states[random.Next(states.Length)]}";

            customers.Add(new Customer
            {
                FullName = fullName,
                Email = email,
                Phone = phone,
                Address = address,
                CreatedAt = RandomDate(random, 520)
            });
        }

        return customers;
    }

    private static List<Car> CreateCars(Random random, List<Supplier> suppliers)
    {
        var catalog = new[]
        {
            ("Ford", new[] { "F-150", "Mustang", "Escape", "Explorer" }),
            ("Chevrolet", new[] { "Silverado", "Camaro", "Tahoe", "Equinox" }),
            ("Toyota", new[] { "Camry", "Corolla", "RAV4", "Highlander" }),
            ("Honda", new[] { "Civic", "Accord", "CR-V", "Pilot" }),
            ("Nissan", new[] { "Altima", "Rogue", "Sentra", "Pathfinder" }),
            ("BMW", new[] { "3 Series", "5 Series", "X3", "X5" }),
            ("Mercedes-Benz", new[] { "C-Class", "E-Class", "GLC", "GLE" }),
            ("Audi", new[] { "A4", "A6", "Q5", "Q7" }),
            ("Hyundai", new[] { "Elantra", "Sonata", "Tucson", "Santa Fe" }),
            ("Kia", new[] { "Soul", "Sportage", "Sorento", "K5" })
        };

        var colors = new[] { "Black", "White", "Silver", "Blue", "Red", "Gray", "Green", "Burgundy", "Gold", "Navy" };
        var cars = new List<Car>(100);

        for (var i = 1; i <= 100; i++)
        {
            var modelSet = catalog[random.Next(catalog.Length)];
            var brand = modelSet.Item1;
            var model = modelSet.Item2[random.Next(modelSet.Item2.Length)];
            var year = random.Next(2016, 2025);
            var purchasePrice = random.Next(14000, 65000) + random.Next(0, 100) / 100m;
            var markup = 1.15m + (decimal)random.NextDouble() * 0.25m;
            var sellingPrice = Math.Round(purchasePrice * markup, 2);
            var supplier = suppliers[random.Next(suppliers.Count)];

            cars.Add(new Car
            {
                Brand = brand,
                Model = model,
                Year = year,
                Color = colors[random.Next(colors.Length)],
                Vin = GenerateVin(i),
                PurchasePrice = purchasePrice,
                SellingPrice = sellingPrice,
                IsAvailable = random.NextDouble() > 0.2,
                Supplier = supplier,
                CreatedAt = RandomDate(random, 720)
            });
        }

        return cars;
    }

    private static List<Inventory> CreateInventories(Random random, List<Car> cars)
    {
        var locations = new[] { "Downtown Lot", "North Warehouse", "South Service Bay", "Showroom A", "Overflow Yard" };

        return cars.Select(car => new Inventory
        {
            Car = car,
            Quantity = car.IsAvailable ? random.Next(1, 5) : random.Next(0, 2),
            Location = locations[random.Next(locations.Length)],
            LastUpdated = RandomDate(random, 90)
        }).ToList();
    }

    private static List<PurchaseOrder> CreatePurchaseOrders(Random random, List<Supplier> suppliers, List<User> users)
    {
        var statuses = new[] { "Pending", "Received", "Backordered", "Cancelled" };
        var notes = new[]
        {
            "New stock order for upcoming promotion.",
            "Restock popular models.",
            "Replacement parts for scheduled maintenance.",
            "Special order from sales team.",
            "Supplier discount applied."
        };

        return Enumerable.Range(1, 60).Select(index =>
        {
            var supplier = suppliers[random.Next(suppliers.Count)];
            var user = users[random.Next(users.Count)];
            var amount = random.Next(15000, 90000) + random.Next(0, 100) / 100m;

            return new PurchaseOrder
            {
                Supplier = supplier,
                User = user,
                OrderDate = RandomDate(random, 240),
                TotalAmount = amount,
                Status = statuses[random.Next(statuses.Length)],
                Notes = notes[random.Next(notes.Length)]
            };
        }).ToList();
    }

    private static List<Sale> CreateSales(Random random, List<Car> cars, List<Customer> customers, List<User> users)
    {
        var statuses = new[] { "Completed", "Pending", "Cancelled" };
        var notes = new[]
        {
            "Customer selected premium warranty.",
            "Trade-in included.",
            "Extended financing approved.",
            "Second test drive scheduled.",
            "Delivery pending registration paperwork."
        };

        return Enumerable.Range(1, 250).Select(_ =>
        {
            var car = cars[random.Next(cars.Count)];
            var customer = customers[random.Next(customers.Count)];
            var user = users[random.Next(users.Count)];
            var amount = car.SellingPrice + random.Next(-500, 1500);
            var status = statuses[random.Next(statuses.Length)];

            return new Sale
            {
                Car = car,
                Customer = customer,
                User = user,
                SaleDate = RandomDate(random, 365),
                TotalAmount = Math.Max(0, Math.Round(amount, 2)),
                Status = status,
                Notes = notes[random.Next(notes.Length)]
            };
        }).ToList();
    }

    private static List<Payment> CreatePayments(Random random, List<Sale> sales)
    {
        var methods = new[] { "Credit Card", "Cash", "Bank Transfer", "Financing" };
        var statuses = new[] { "Completed", "Pending", "Failed" };

        return sales.Select(sale => new Payment
        {
            Sale = sale,
            Amount = sale.TotalAmount,
            Method = methods[random.Next(methods.Length)],
            Status = sale.Status == "Completed" ? statuses[random.Next(1)] : statuses[random.Next(statuses.Length)],
            ReferenceNumber = $"PMT{random.Next(100000, 999999)}",
            PaymentDate = sale.SaleDate.AddDays(random.Next(0, 10))
        }).ToList();
    }

    private static DateTime RandomDate(Random random, int daysBack)
    {
        return DateTime.UtcNow.AddDays(-random.Next(0, daysBack)).AddHours(-random.Next(0, 24)).AddMinutes(-random.Next(0, 60));
    }

    private static string GenerateVin(int index)
    {
        return $"ZFA{index:D3}{randomNumericString(6)}{index % 10}";
    }

    private static string randomNumericString(int length)
    {
        var digits = "0123456789";
        var buffer = new char[length];
        var random = new Random(100 + length);

        for (var i = 0; i < length; i++)
        {
            buffer[i] = digits[random.Next(digits.Length)];
        }

        return new string(buffer);
    }
}

using System;

namespace CarSales.Api.Services;

public class VectorSimilarityService : IVectorSimilarityService
{
    public double CalculateCosineSimilarity(float[] vectorA, float[] vectorB)
    {
        if (vectorA == null || vectorB == null)
        {
            throw new ArgumentNullException("Vectors cannot be null.");
        }

        if (vectorA.Length != vectorB.Length)
        {
            throw new ArgumentException("Vectors must have the same length for similarity calculation.");
        }

        double dotProduct = 0.0;
        double normA = 0.0;
        double normB = 0.0;

        for (int i = 0; i < vectorA.Length; i++)
        {
            double a = vectorA[i];
            double b = vectorB[i];

            dotProduct += a * b;
            normA += a * a;
            normB += b * b;
        }

        if (normA == 0.0 || normB == 0.0)
        {
            // Edge case: return 0 if either vector has 0 magnitude
            return 0.0;
        }

        return dotProduct / (Math.Sqrt(normA) * Math.Sqrt(normB));
    }
}

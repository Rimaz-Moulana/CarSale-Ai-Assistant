namespace CarSales.Api.Services;

public interface IVectorSimilarityService
{
    double CalculateCosineSimilarity(float[] vectorA, float[] vectorB);
}

"""
Clean up old news articles and remove Indian news sources.
"""
import sys
from pathlib import Path
from datetime import datetime, timedelta

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.db.supabase import get_supabase_service_client


def cleanup_old_articles(days: int = 30):
    """Remove news articles older than specified days."""
    client = get_supabase_service_client()

    cutoff_date = (datetime.utcnow() - timedelta(days=days)).isoformat()

    print(f"Cleaning up articles older than {days} days (before {cutoff_date[:10]})")

    # First, delete embeddings for old articles
    old_articles = client.table("news_articles").select("id").lt(
        "published_at", cutoff_date
    ).execute()

    if old_articles.data:
        article_ids = [a["id"] for a in old_articles.data]
        print(f"Found {len(article_ids)} old articles to clean up")

        # Delete embeddings first (foreign key constraint)
        for article_id in article_ids:
            try:
                client.table("news_embeddings").delete().eq("news_id", article_id).execute()
            except Exception as e:
                pass  # May not exist

        # Delete entity mentions
        for article_id in article_ids:
            try:
                client.table("news_entity_mentions").delete().eq("news_id", article_id).execute()
            except Exception as e:
                pass  # May not exist

        # Delete old articles
        result = client.table("news_articles").delete().lt(
            "published_at", cutoff_date
        ).execute()

        print(f"Deleted {len(article_ids)} old articles")
    else:
        print("No old articles to clean up")


def remove_indian_sources():
    """Remove Indian news sources from the database."""
    client = get_supabase_service_client()

    # List of Indian sources to remove
    indian_sources = [
        "Economic Times India",
        "Economic Times",
        "RSS - Economic Times",
        "RSS - Economic Times India",
        "Times of India",
        "Hindustan Times",
        "NDTV",
        "Moneycontrol",
        "Business Standard India",
        "Mint",
        "LiveMint",
    ]

    print("Removing Indian news sources...")

    removed = 0
    for source_name in indian_sources:
        # Find the source
        source = client.table("news_sources").select("id").eq("name", source_name).execute()

        if source.data:
            source_id = source.data[0]["id"]

            # Delete articles from this source first
            articles = client.table("news_articles").select("id").eq("source_id", source_id).execute()

            if articles.data:
                article_ids = [a["id"] for a in articles.data]

                # Delete embeddings
                for article_id in article_ids:
                    try:
                        client.table("news_embeddings").delete().eq("news_id", article_id).execute()
                    except Exception:
                        pass

                # Delete entity mentions
                for article_id in article_ids:
                    try:
                        client.table("news_entity_mentions").delete().eq("news_id", article_id).execute()
                    except Exception:
                        pass

                # Delete articles
                client.table("news_articles").delete().eq("source_id", source_id).execute()
                print(f"  Deleted {len(article_ids)} articles from {source_name}")

            # Delete the source
            client.table("news_sources").delete().eq("id", source_id).execute()
            print(f"  Removed source: {source_name}")
            removed += 1

    print(f"\nRemoved {removed} Indian sources")


def remove_articles_with_indian_content():
    """Remove articles that have Indian-specific content."""
    client = get_supabase_service_client()

    # Keywords that indicate Indian-specific content
    indian_keywords = [
        "sensex", "nifty", "bse", "nse india", "mumbai stock",
        "rbi", "reserve bank of india", "inr", "indian rupee",
        "modi government", "delhi", "mumbai market",
    ]

    print("Scanning for articles with Indian-specific content...")

    deleted = 0
    for keyword in indian_keywords:
        # Find articles with this keyword in title or summary
        articles = client.table("news_articles").select("id, title").or_(
            f"title.ilike.%{keyword}%,summary.ilike.%{keyword}%"
        ).execute()

        if articles.data:
            for article in articles.data:
                article_id = article["id"]

                # Delete embeddings
                try:
                    client.table("news_embeddings").delete().eq("news_id", article_id).execute()
                except Exception:
                    pass

                # Delete entity mentions
                try:
                    client.table("news_entity_mentions").delete().eq("news_id", article_id).execute()
                except Exception:
                    pass

                # Delete article
                client.table("news_articles").delete().eq("id", article_id).execute()
                print(f"  Deleted: {article['title'][:50]}...")
                deleted += 1

    print(f"\nDeleted {deleted} articles with Indian content")


def show_current_sources():
    """Display current news sources in the database."""
    client = get_supabase_service_client()

    sources = client.table("news_sources").select("*").order("name").execute()

    print("\n=== Current News Sources ===")
    print(f"Total: {len(sources.data)} sources\n")

    for source in sources.data:
        status = "[+]" if source.get("is_active") else "[-]"
        print(f"  {status} {source['name']} ({source.get('source_type', 'unknown')})")


def main():
    print("=" * 50)
    print("NEWS CLEANUP UTILITY")
    print("=" * 50)

    # Show current sources
    show_current_sources()

    print("\n" + "=" * 50)
    print("STEP 1: Removing Indian news sources")
    print("=" * 50)
    remove_indian_sources()

    print("\n" + "=" * 50)
    print("STEP 2: Removing articles with Indian content")
    print("=" * 50)
    remove_articles_with_indian_content()

    print("\n" + "=" * 50)
    print("STEP 3: Cleaning up old articles (>30 days)")
    print("=" * 50)
    cleanup_old_articles(days=30)

    print("\n" + "=" * 50)
    print("FINAL: Updated news sources")
    print("=" * 50)
    show_current_sources()

    print("\n[DONE] Cleanup complete!")


if __name__ == "__main__":
    main()

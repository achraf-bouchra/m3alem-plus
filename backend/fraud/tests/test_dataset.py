import csv
import os

from django.test import SimpleTestCase


class FraudDatasetTest(SimpleTestCase):
    def test_fake_reviews_dataset_loads(self):
        base_dir = os.path.dirname(os.path.dirname(__file__))
        dataset_path = os.path.join(base_dir, "datasets", "fake reviews dataset.csv")

        self.assertTrue(
            os.path.exists(dataset_path),
            f"Dataset file not found: {dataset_path}"
        )

        with open(dataset_path, newline='', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            rows = list(reader)

        self.assertGreater(
            len(rows),
            0,
            "Fake reviews dataset should contain at least one row"
        )

        self.assertIn(
            "category",
            reader.fieldnames,
            "Expected 'category' column in dataset"
        )
        self.assertIn(
            "rating",
            reader.fieldnames,
            "Expected 'rating' column in dataset"
        )
        self.assertIn(
            "label",
            reader.fieldnames,
            "Expected 'label' column in dataset"
        )
        self.assertIn(
            "text_",
            reader.fieldnames,
            "Expected 'text_' column in dataset"
        )

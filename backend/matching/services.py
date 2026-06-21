from math import asin, cos, radians, sin, sqrt

from accounts.models import ArtisanProfile


def haversine_distance(lat1, lng1, lat2, lng2):
    earth_radius_km = 6371.0
    lat1, lng1, lat2, lng2 = map(float, (lat1, lng1, lat2, lng2))
    dlat = radians(lat2 - lat1)
    dlng = radians(lng2 - lng1)
    a = (
        sin(dlat / 2) ** 2
        + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlng / 2) ** 2
    )
    return 2 * earth_radius_km * asin(sqrt(a))


def score_for_artisan(artisan, latitude, longitude, max_distance=2.0):
    if artisan.latitude is None or artisan.longitude is None or not artisan.available:
        return None

    distance = haversine_distance(latitude, longitude, artisan.latitude, artisan.longitude)
    if distance >= max_distance:
        return None

    rating = max(0.0, min(5.0, float(artisan.rating or 0)))
    return round(distance + (5.0 - rating), 2)


def serialize_artisan_match(artisan, latitude, longitude):
    distance = haversine_distance(latitude, longitude, artisan.latitude, artisan.longitude)
    rating = max(0.0, min(5.0, float(artisan.rating or 0)))
    profile_image = artisan.profile_image.url if artisan.profile_image else None
    display_name = artisan.user.get_full_name() or (
        artisan.category.name if artisan.category else artisan.user.email
    )
    return {
        "id": str(artisan.user_id),
        "name": display_name,
        "category": artisan.category.name if artisan.category else None,
        "rating": rating,
        "available": artisan.available,
        "latitude": artisan.latitude,
        "longitude": artisan.longitude,
        "distance": round(distance, 2),
        "score": round(distance + (5.0 - rating), 2),
        "profile_image": profile_image,
        "profile_image_url": profile_image,
    }


def find_nearby_artisans_by_location(latitude, longitude, radius_km=2.0, limit=10):
    artisans = ArtisanProfile.objects.select_related("user").filter(
        available=True,
        latitude__isnull=False,
        longitude__isnull=False,
    )
    candidates = []
    for artisan in artisans:
        score = score_for_artisan(artisan, latitude, longitude, max_distance=radius_km)
        if score is not None:
            distance = haversine_distance(latitude, longitude, artisan.latitude, artisan.longitude)
            display_name = artisan.user.get_full_name() or (
                artisan.category.name if artisan.category else artisan.user.email
            )
            candidates.append({
                "id": str(artisan.user_id),
                "artisan_id": artisan.user.id,
                "name": display_name,
                "email": artisan.user.email,
                "category": artisan.category.name if artisan.category else None,
                "available": artisan.available,
                "rating": artisan.rating,
                "latitude": artisan.latitude,
                "longitude": artisan.longitude,
                "distance": round(distance, 2),
                "score": score,
                "profile_image": artisan.profile_image.url if artisan.profile_image else None,
            })
    candidates.sort(key=lambda item: item["score"])
    return candidates[:limit]


def find_nearby_artisans_for_service(latitude, longitude, service=None, radius_km=2.0, limit=10):
    if not service:
        return []

    artisans = ArtisanProfile.objects.select_related("user", "category").filter(
        available=True,
        latitude__isnull=False,
        longitude__isnull=False,
        category=service.category,
        user__role="ARTISAN",
        user__is_active=True,
    )

    candidates = []
    for artisan in artisans:
        score = score_for_artisan(artisan, latitude, longitude, max_distance=radius_km)
        if score is None:
            continue
        candidates.append(serialize_artisan_match(artisan, latitude, longitude))
    candidates.sort(key=lambda item: item["score"])
    return candidates[:limit]


def find_nearby_artisans(request_obj, radius_km=2.0, limit=10):
    return find_nearby_artisans_for_service(
        request_obj.latitude,
        request_obj.longitude,
        service=request_obj.service,
        radius_km=radius_km,
        limit=limit,
    )


def compute_matching_suggestions(request_obj, radius_km=2.0):
    return find_nearby_artisans(request_obj, radius_km=radius_km, limit=5)

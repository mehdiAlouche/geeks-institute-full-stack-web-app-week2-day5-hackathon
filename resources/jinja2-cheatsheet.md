# Jinja2 Cheat Sheet - Movies Manager Project

## Template Inheritance
```jinja2
<!-- base.html -->
{% block content %} {% endblock %}

<!-- child template -->
{% extends "base.html" %}
{% block content %}
  <!-- content here -->
{% endblock %}
```

## Variables & Output
```jinja2
{{ movie.title }}           <!-- Simple variable -->
{{ movie.rating }}          <!-- Object property -->
{{ movie.year }}            <!-- Numeric value -->
```

## Control Structures

### If/Else
```jinja2
{% if movies %}
  <!-- show movies -->
{% else %}
  <!-- no movies found -->
{% endif %}
```

### For Loops
```jinja2
{% for movie in movies %}
  {{ movie.title }}
{% endfor %}

{% for i in range(1, total_pages + 1) %}
  {{ i }}
{% endfor %}
```

### With Statement
```jinja2
{% with messages = get_flashed_messages(with_categories=true) %}
  {% for category, message in messages %}
    {{ message }}
  {% endfor %}
{% endwith %}
```

## URL Generation
```jinja2
{{ url_for('index') }}                           <!-- Basic route -->
{{ url_for('index', page=1) }}                   <!-- With parameters -->
{{ url_for('movie_detail', movie_id=movie.id) }} <!-- Dynamic route -->
```

## Filters
```jinja2
{{ genres|tojson }}        <!-- Convert to JSON -->
```

## Conditional Logic in URLs
```jinja2
{{ url_for('index', page=page - 1 if page > 1 else page) }}
{{ url_for('index', page=page + 1 if page < total_pages else page) }}
```

## Template Context
- `movies` - List of movie objects
- `movie` - Single movie object  
- `actors` - List of actor objects
- `page`, `total_pages` - Pagination variables
- `genres`, `dataset`, `dataset2` - Chart data
- `total_movies` - Count variable

## Common Patterns Used
1. **Template inheritance** with `base.html`
2. **Conditional rendering** with `{% if %}`
3. **Looping** through collections with `{% for %}`
4. **Dynamic URLs** with `url_for()`
5. **Flash messages** with `get_flashed_messages()`
6. **JSON serialization** for JavaScript with `|tojson`

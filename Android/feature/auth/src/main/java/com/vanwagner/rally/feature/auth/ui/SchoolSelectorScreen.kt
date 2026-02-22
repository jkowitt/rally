package com.vanwagner.rally.feature.auth.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.School
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CenterAlignedTopAppBar
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.vanwagner.rally.core.model.School
import com.vanwagner.rally.core.model.SchoolTheme
import com.vanwagner.rally.core.theme.RallyTheme
import com.vanwagner.rally.feature.auth.viewmodel.AuthViewModel

// ── Public Screen Entry ─────────────────────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SchoolSelectorScreen(
    viewModel: AuthViewModel = hiltViewModel(),
    onSchoolSelected: () -> Unit = {},
    onNavigateBack: () -> Unit = {},
) {
    var searchQuery by rememberSaveable { mutableStateOf("") }

    // TODO: Replace with actual school list from repository / API
    val schools = remember { sampleSchools() }

    val filteredSchools = remember(searchQuery, schools) {
        if (searchQuery.isBlank()) {
            schools
        } else {
            schools.filter { school ->
                school.name.contains(searchQuery, ignoreCase = true) ||
                    school.mascot.contains(searchQuery, ignoreCase = true)
            }
        }
    }

    Scaffold(
        topBar = {
            CenterAlignedTopAppBar(
                title = { Text("Choose Your School") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Back",
                        )
                    }
                },
            )
        },
    ) { paddingValues ->
        SchoolSelectorContent(
            schools = filteredSchools,
            searchQuery = searchQuery,
            onSearchQueryChange = { searchQuery = it },
            onSchoolTap = { school ->
                viewModel.selectSchool(school)
                onSchoolSelected()
            },
            modifier = Modifier.padding(paddingValues),
        )
    }
}

// ── Stateless Content ───────────────────────────────────────────────────

@Composable
private fun SchoolSelectorContent(
    schools: List<School>,
    searchQuery: String,
    onSearchQueryChange: (String) -> Unit,
    onSchoolTap: (School) -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier.fillMaxSize()) {
        // ── Search Bar ──────────────────────────────────────────────────
        OutlinedTextField(
            value = searchQuery,
            onValueChange = onSearchQueryChange,
            placeholder = { Text("Search schools...") },
            leadingIcon = {
                Icon(Icons.Default.Search, contentDescription = "Search")
            },
            singleLine = true,
            shape = RoundedCornerShape(12.dp),
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 8.dp),
        )

        Spacer(Modifier.height(8.dp))

        // ── School Grid ─────────────────────────────────────────────────
        if (schools.isEmpty()) {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    text = "No schools match your search.",
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        } else {
            LazyVerticalGrid(
                columns = GridCells.Adaptive(minSize = 150.dp),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                items(schools, key = { it.id }) { school ->
                    SchoolCard(
                        school = school,
                        onClick = { onSchoolTap(school) },
                    )
                }
            }
        }
    }
}

// ── School Card ─────────────────────────────────────────────────────────

@Composable
private fun SchoolCard(
    school: School,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Card(
        modifier = modifier
            .fillMaxWidth()
            .aspectRatio(0.85f)
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(16.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface,
        ),
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(12.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            // ── School Logo Placeholder ─────────────────────────────────
            Box(
                modifier = Modifier
                    .size(64.dp)
                    .clip(CircleShape)
                    .background(Color(school.theme.primaryColor.toColorInt()))
                    .border(2.dp, Color(school.theme.secondaryColor.toColorInt()), CircleShape),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    imageVector = Icons.Filled.School,
                    contentDescription = null,
                    modifier = Modifier.size(32.dp),
                    tint = Color.White,
                )
            }

            Spacer(Modifier.height(12.dp))

            // ── School Name ─────────────────────────────────────────────
            Text(
                text = school.name,
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.Bold,
                textAlign = TextAlign.Center,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
            )

            Spacer(Modifier.height(4.dp))

            // ── Mascot ──────────────────────────────────────────────────
            Text(
                text = school.mascot,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )

            Spacer(Modifier.height(8.dp))

            // ── Theme Preview (color bar) ───────────────────────────────
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(6.dp)
                    .clip(RoundedCornerShape(3.dp))
                    .background(Color(school.theme.primaryColor.toColorInt())),
            )
        }
    }
}

// ── Helpers ─────────────────────────────────────────────────────────────

/** Parse a hex color string like "#FF5722" to a [Long] suitable for [Color]. */
private fun String.toColorInt(): Long {
    val hex = removePrefix("#")
    return when (hex.length) {
        6 -> "FF$hex".toLong(16)
        8 -> hex.toLong(16)
        else -> 0xFF888888
    }
}

/** Sample schools for preview and initial development. */
private fun sampleSchools(): List<School> = listOf(
    School(id = "duke", name = "Duke University", mascot = "Blue Devils", abbreviation = "DUKE", theme = SchoolTheme(primaryColor = "#003087", secondaryColor = "#FFFFFF", accentColor = "#003087")),
    School(id = "unc", name = "UNC Chapel Hill", mascot = "Tar Heels", abbreviation = "UNC", theme = SchoolTheme(primaryColor = "#7BAFD4", secondaryColor = "#13294B", accentColor = "#7BAFD4")),
    School(id = "ncstate", name = "NC State", mascot = "Wolfpack", abbreviation = "NCST", theme = SchoolTheme(primaryColor = "#CC0000", secondaryColor = "#000000", accentColor = "#CC0000")),
    School(id = "wake", name = "Wake Forest", mascot = "Demon Deacons", abbreviation = "WAKE", theme = SchoolTheme(primaryColor = "#9E7E38", secondaryColor = "#000000", accentColor = "#9E7E38")),
    School(id = "clemson", name = "Clemson University", mascot = "Tigers", abbreviation = "CLEM", theme = SchoolTheme(primaryColor = "#F56600", secondaryColor = "#522D80", accentColor = "#F56600")),
    School(id = "uva", name = "University of Virginia", mascot = "Cavaliers", abbreviation = "UVA", theme = SchoolTheme(primaryColor = "#232D4B", secondaryColor = "#F84C1E", accentColor = "#232D4B")),
    School(id = "vt", name = "Virginia Tech", mascot = "Hokies", abbreviation = "VT", theme = SchoolTheme(primaryColor = "#630031", secondaryColor = "#CF4420", accentColor = "#630031")),
    School(id = "louisville", name = "Louisville", mascot = "Cardinals", abbreviation = "LOU", theme = SchoolTheme(primaryColor = "#AD0000", secondaryColor = "#000000", accentColor = "#AD0000")),
    School(id = "pitt", name = "University of Pittsburgh", mascot = "Panthers", abbreviation = "PITT", theme = SchoolTheme(primaryColor = "#003594", secondaryColor = "#FFB81C", accentColor = "#003594")),
    School(id = "fsu", name = "Florida State", mascot = "Seminoles", abbreviation = "FSU", theme = SchoolTheme(primaryColor = "#782F40", secondaryColor = "#CEB888", accentColor = "#782F40")),
    School(id = "gatech", name = "Georgia Tech", mascot = "Yellow Jackets", abbreviation = "GT", theme = SchoolTheme(primaryColor = "#B3A369", secondaryColor = "#003057", accentColor = "#B3A369")),
    School(id = "miami", name = "University of Miami", mascot = "Hurricanes", abbreviation = "MIA", theme = SchoolTheme(primaryColor = "#F47321", secondaryColor = "#005030", accentColor = "#F47321")),
)

// ── Previews ────────────────────────────────────────────────────────────

@Preview(showBackground = true, showSystemUi = true)
@Composable
private fun SchoolSelectorPreview() {
    RallyTheme {
        SchoolSelectorContent(
            schools = sampleSchools(),
            searchQuery = "",
            onSearchQueryChange = {},
            onSchoolTap = {},
        )
    }
}

@Preview(showBackground = true, showSystemUi = true, name = "With Search")
@Composable
private fun SchoolSelectorSearchPreview() {
    RallyTheme {
        SchoolSelectorContent(
            schools = sampleSchools().filter { it.name.contains("Duke", ignoreCase = true) },
            searchQuery = "Duke",
            onSearchQueryChange = {},
            onSchoolTap = {},
        )
    }
}
